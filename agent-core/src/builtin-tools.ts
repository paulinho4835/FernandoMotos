import type { AgentTool } from './types'

// Tool de derivación a humano, igual en todos los rubros. Marca el contexto
// (handleIncomingMessage pausa la conversación al verlo) y opcionalmente
// notifica al equipo.
export function createHandoffTool(opts?: {
  name?: string
  description?: string
  // Hook para notificar al equipo (insertar alerta, mandar mensaje interno...).
  onHandoff?: (ctx: { telefono: string; reason?: string }) => Promise<void>
}): AgentTool {
  return {
    name: opts?.name ?? 'hablar_con_humano',
    description:
      opts?.description ??
      'Deriva la conversación a una persona del equipo cuando el cliente lo pide o el caso excede al bot.',
    parameters: {
      type: 'object',
      properties: {
        motivo: { type: 'string', description: 'Motivo breve de la derivación' },
      },
    },
    execute: async (args, ctx) => {
      ctx.agent.handoffRequested = true
      ctx.agent.handoffReason = typeof args.motivo === 'string' ? args.motivo : undefined
      if (opts?.onHandoff) {
        try {
          await opts.onHandoff({ telefono: ctx.telefono, reason: ctx.agent.handoffReason })
        } catch (e) {
          // La derivación en sí no debe fallar porque falló la notificación.
          console.error('[agent-core] onHandoff falló:', e)
        }
      }
      return 'OK: conversación derivada a una persona del equipo. Dile al cliente que un asesor le escribirá enseguida.'
    },
  }
}
