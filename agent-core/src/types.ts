// Tipos compartidos del core. El contrato entre el core (genérico) y cada
// rubro (motos, clínica, etc.) es AgentConfig: el rubro aporta prompt + tools,
// el core aporta loop, guard, persistencia y normalización.

export type ToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string | Record<string, unknown> }
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

// Contexto de la conversación que reciben los executors de tools.
export type ToolContext = {
  // Número de WhatsApp/teléfono del cliente, ya normalizado (solo dígitos).
  telefono: string
  // Metadata arbitraria que el adaptador de entrada quiera pasar (clinicId, etc.)
  meta: Record<string, string>
  // Mutable: las tools lo marcan y el core lo lee al final del loop.
  agent: AgentContext
}

// Contexto mutable de una corrida del agente. handoffRequested lo marca la
// tool de derivación y el endpoint lo lee para pausar la conversación.
// actionAttempted/actionSucceeded alimentan el guard anti-mentira: detectan EN
// CÓDIGO cuando el modelo confirma una acción que en realidad falló (el LLM a
// veces ignora la regla "no confirmes si hay ERROR" — visto en producción).
export type AgentContext = {
  handoffRequested: boolean
  handoffReason?: string
  actionAttempted: boolean
  actionSucceeded: boolean
}

// Una tool del rubro: schema JSON + executor juntos, para que definición y
// ejecución nunca se desincronicen (en el diseño anterior vivían separados).
export type AgentTool = {
  name: string
  description: string
  // JSON Schema de los parámetros (formato OpenAI function calling).
  parameters: Record<string, unknown>
  // Debe devolver un string para el LLM. Convención OBLIGATORIA:
  //   - Éxito de una acción: empezar con "OK:".
  //   - Fallo: empezar con "ERROR:", decir qué NO pasó y qué debe hacer el LLM.
  //   - Consultas de solo lectura: JSON.stringify(datos) o texto informativo.
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>
  // Marcar true en tools que EJECUTAN acciones (crear pedido, agendar cita,
  // cancelar). Activa el guard anti-mentira: si se intentó y ninguna terminó
  // en "OK:", el core reemplaza una confirmación inventada del LLM.
  isAction?: boolean
}

export type AgentConfig = {
  // Nombre del negocio, disponible para el prompt.
  negocio: string
  // System prompt del rubro. Recibe el contexto por si quiere variar
  // (phoneVerified, nombre del cliente, etc.).
  buildSystemPrompt: (ctx: { negocio: string; meta: Record<string, string> }) => string
  tools: AgentTool[]
  // Respuesta segura cuando el guard detecta confirmación inventada o el loop
  // se agota. Si no se define, se usa un mensaje genérico en español neutro.
  fallbackReply?: string
  // Máximo de iteraciones del loop de tool-calling (default 5).
  maxIters?: number
  // Cuántos mensajes de historial persistir (default 20).
  historyLimit?: number
}

// Persistencia de conversación. El core no conoce tablas: cada proyecto pasa
// una implementación (hay una de fábrica para Supabase en conversation.ts).
export type ConversationStore = {
  load: (telefono: string) => Promise<{ historial: ChatMessage[]; estado: 'activa' | 'pausada' }>
  save: (telefono: string, historial: ChatMessage[]) => Promise<void>
  pause: (telefono: string) => Promise<void>
}

// Abstracción del LLM: permite usar OpenRouter (default) o cualquier API
// compatible con OpenAI sin tocar el loop.
export type LlmCaller = (params: {
  messages: ChatMessage[]
  tools: unknown[]
}) => Promise<{ content: string | null; tool_calls?: ToolCall[] }>
