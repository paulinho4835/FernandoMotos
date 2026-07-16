import { createOpenRouterCaller } from './llm'
import { parseToolArgs } from './normalize'
import type {
  AgentConfig,
  AgentContext,
  ChatMessage,
  ConversationStore,
  LlmCaller,
  ToolContext,
} from './types'

const DEFAULT_FALLBACK =
  'Disculpa, tuve un inconveniente para procesar tu mensaje. Una persona del equipo te escribirá enseguida.'

// Convierte las tools del rubro al formato function-calling de OpenAI.
function toOpenAiTools(config: AgentConfig): unknown[] {
  return config.tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }))
}

export type RunAgentResult = {
  reply: string
  // Historial actualizado (ya persistido por runAgent si se pasó store).
  historial: ChatMessage[]
  context: AgentContext
}

// Corre una vuelta completa del agente: loop de tool-calling acotado, guard
// anti-mentira y fallback si el loop se agota. Persistencia y pausa por
// handoff quedan a cargo del caller o del helper handleIncomingMessage.
export async function runAgent(opts: {
  config: AgentConfig
  history: ChatMessage[]
  text: string
  telefono: string
  meta?: Record<string, string>
  llm?: LlmCaller
}): Promise<RunAgentResult> {
  const { config } = opts
  const llm = opts.llm ?? createOpenRouterCaller({ title: config.negocio })
  const maxIters = config.maxIters ?? 5

  const agent: AgentContext = {
    handoffRequested: false,
    actionAttempted: false,
    actionSucceeded: false,
  }
  const toolCtx: ToolContext = { telefono: opts.telefono, meta: opts.meta ?? {}, agent }
  const toolsByName = new Map(config.tools.map((t) => [t.name, t]))

  const system: ChatMessage = {
    role: 'system',
    content: config.buildSystemPrompt({ negocio: config.negocio, meta: toolCtx.meta }),
  }
  const history: ChatMessage[] = [...opts.history, { role: 'user', content: opts.text }]

  let reply: string | null = null
  // Loop acotado para evitar bucles infinitos de tool-calling.
  for (let i = 0; i < maxIters; i++) {
    const out = await llm({ messages: [system, ...history], tools: toOpenAiTools(config) })

    if (out.tool_calls && out.tool_calls.length > 0) {
      history.push({ role: 'assistant', content: out.content, tool_calls: out.tool_calls })
      for (const call of out.tool_calls) {
        const tool = toolsByName.get(call.function.name)
        let result: string
        if (!tool) {
          result = `ERROR: herramienta desconocida "${call.function.name}".`
        } else {
          if (tool.isAction) agent.actionAttempted = true
          try {
            result = await tool.execute(parseToolArgs(call.function.arguments), toolCtx)
          } catch (e) {
            // Las tools deberían devolver "ERROR: ..." en vez de lanzar, pero
            // si lanzan igual el LLM recibe una instrucción clara.
            result = `ERROR: la operación falló (${String((e as Error).message ?? e)}). No confirmes éxito; informa al cliente que hubo un problema técnico.`
          }
          if (tool.isAction && result.startsWith('OK:')) agent.actionSucceeded = true
        }
        history.push({ role: 'tool', tool_call_id: call.id, content: result })
      }
      continue
    }

    reply = out.content
    history.push({ role: 'assistant', content: reply })
    break
  }

  const fallback = config.fallbackReply ?? DEFAULT_FALLBACK

  // Loop agotado sin respuesta de texto: no dejar al cliente sin contestación
  // ni la falla invisible.
  if (reply === null) {
    console.error(`[agent-core] loop de tool-calling agotado sin respuesta para ${opts.telefono}`)
    reply = fallback
    history.push({ role: 'assistant', content: reply })
  }

  // Guard anti-mentira: se intentó una acción, ninguna terminó en "OK:", pero
  // el LLM respondió texto que puede leerse como confirmación. Reemplazar por
  // una respuesta segura — el LLM a veces ignora la regla del prompt.
  if (agent.actionAttempted && !agent.actionSucceeded && looksLikeConfirmation(reply)) {
    console.error(`[agent-core] guard anti-mentira activado para ${opts.telefono}: "${reply}"`)
    reply =
      'No pude completar la operación por un inconveniente técnico. No quedó registrada. Una persona del equipo te contactará para ayudarte.'
    history[history.length - 1] = { role: 'assistant', content: reply }
  }

  return { reply, historial: history, context: agent }
}

// Heurística conservadora: solo pisa la respuesta si suena a confirmación
// explícita. Preguntas o mensajes de error del propio LLM pasan intactos.
function looksLikeConfirmation(reply: string): boolean {
  const r = reply.toLowerCase()
  if (r.includes('?') || r.includes('¿')) return false
  if (/(no pude|no se pudo|problema|error|inconveniente|falta|necesito)/.test(r)) return false
  return /(listo|agendad|registrad|cread|confirmad|reservad|hecho|ya qued|perfecto)/.test(r)
}

// Helper de más alto nivel: chequeo de pausa, corrida del agente, persistencia
// y pausa automática si hubo handoff. Devuelve reply null si la conversación
// está pausada (el caller no debe responder).
export async function handleIncomingMessage(opts: {
  config: AgentConfig
  store: ConversationStore
  telefono: string
  text: string
  meta?: Record<string, string>
  llm?: LlmCaller
}): Promise<{ reply: string | null; context?: AgentContext }> {
  const conv = await opts.store.load(opts.telefono)
  if (conv.estado === 'pausada') return { reply: null }

  const result = await runAgent({
    config: opts.config,
    history: conv.historial,
    text: opts.text,
    telefono: opts.telefono,
    meta: opts.meta,
    llm: opts.llm,
  })

  const limit = opts.config.historyLimit ?? 20
  await opts.store.save(opts.telefono, result.historial.slice(-limit))
  if (result.context.handoffRequested) await opts.store.pause(opts.telefono)

  return { reply: result.reply, context: result.context }
}
