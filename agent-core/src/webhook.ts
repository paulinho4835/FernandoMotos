import { handleIncomingMessage } from './loop'
import { normalizeDigits } from './normalize'
import type { AgentConfig, ConversationStore, LlmCaller } from './types'

// Handler HTTP genérico para el webhook de WhatsApp (Fetch API estándar:
// funciona como POST de un route handler de Next.js App Router).
//
// Contrato del body (el que ya usa whatsapp-service):
//   { from: string, text: string, phoneVerified?: boolean }
// Respuesta: { reply: string | null }  — null = no responder (pausada/inactiva).
//
// Auth: header x-agent-secret debe coincidir con secret (o el env var
// AGENT_WEBHOOK_SECRET). Sin secret configurado se rechaza TODO: es
// preferible fallar ruidoso en el deploy que exponer el agente.
export function createWhatsAppHandler(opts: {
  config: AgentConfig
  // Se crea por request para no compartir clientes entre invocaciones serverless.
  getStore: () => ConversationStore
  secret?: string
  // Gate global (ej. flag agente_wa_activo en la tabla configuracion).
  isActive?: () => Promise<boolean>
  llm?: LlmCaller
}): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const secret = opts.secret ?? process.env.AGENT_WEBHOOK_SECRET
    if (!secret || request.headers.get('x-agent-secret') !== secret) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      from?: string
      text?: string
      phoneVerified?: boolean
    }
    const from = normalizeDigits(body.from ?? '')
    const text = (body.text ?? '').trim()
    if (!from || !text) return Response.json({ reply: null })

    if (opts.isActive && !(await opts.isActive())) return Response.json({ reply: null })

    const { reply } = await handleIncomingMessage({
      config: opts.config,
      store: opts.getStore(),
      telefono: from,
      text,
      meta: { phoneVerified: body.phoneVerified === false ? 'false' : 'true' },
      llm: opts.llm,
    })

    return Response.json({ reply })
  }
}
