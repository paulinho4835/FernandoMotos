import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buscarMotos, detalleMoto, crearPedido, pedidosPendientesDe, pausarConversacion,
} from './queries'

// Normaliza los arguments de un tool call. OpenRouter suele mandarlos como
// string JSON, pero algunos modelos los mandan como objeto (bug clásico de
// Vapi). Nunca hacer JSON.parse a ciegas.
export function parseToolArgs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return {}
}

export const toolDefinitions: unknown[] = [
  {
    type: 'function',
    function: {
      name: 'buscar_motos',
      description: 'Busca motos en el catálogo por marca, modelo, año o rango de precio. Devuelve stock disponible y precio. Úsalo SIEMPRE antes de afirmar precio o disponibilidad.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texto libre (marca, modelo o descripción)' },
          marca: { type: 'string' },
          modelo: { type: 'string' },
          anio: { type: 'integer' },
          precio_min: { type: 'number' },
          precio_max: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detalle_moto',
      description: 'Devuelve las especificaciones completas de una moto por su id.',
      parameters: {
        type: 'object',
        properties: { moto_id: { type: 'string' } },
        required: ['moto_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'crear_pedido',
      description: 'Crea un pedido pendiente de una moto para que un vendedor lo confirme. Requiere el nombre del cliente.',
      parameters: {
        type: 'object',
        properties: {
          moto_id: { type: 'string' },
          cliente_nombre: { type: 'string' },
          cliente_telefono: { type: 'string', description: 'Opcional; por defecto el número de WhatsApp del cliente' },
          precio_ofertado: { type: 'number' },
          notas: { type: 'string' },
        },
        required: ['moto_id', 'cliente_nombre'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estado_pedido',
      description: 'Lista los pedidos pendientes del cliente actual.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'hablar_con_humano',
      description: 'Deriva la conversación a un vendedor humano cuando el cliente lo pide o el caso excede al bot.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

export async function executeTool(
  supabase: SupabaseClient,
  name: string,
  rawArgs: unknown,
  ctx: { telefono: string },
): Promise<string> {
  const args = parseToolArgs(rawArgs)
  try {
    switch (name) {
      case 'buscar_motos': {
        const motos = await buscarMotos(supabase, {
          query: args.query as string | undefined,
          marca: args.marca as string | undefined,
          modelo: args.modelo as string | undefined,
          anio: typeof args.anio === 'number' ? args.anio : undefined,
          precio_min: typeof args.precio_min === 'number' ? args.precio_min : undefined,
          precio_max: typeof args.precio_max === 'number' ? args.precio_max : undefined,
        })
        if (motos.length === 0) return 'No se encontraron motos con esos criterios. Pide al cliente que ajuste la búsqueda.'
        return JSON.stringify(motos)
      }
      case 'detalle_moto': {
        const id = args.moto_id as string | undefined
        if (!id) return 'ERROR: falta moto_id. Vuelve a llamar detalle_moto con el id de una moto de buscar_motos.'
        const m = await detalleMoto(supabase, id)
        if (!m) return 'ERROR: no se encontró esa moto. No inventes datos; usa buscar_motos para obtener ids válidos.'
        return JSON.stringify(m)
      }
      case 'crear_pedido': {
        const moto_id = args.moto_id as string | undefined
        const cliente_nombre = (args.cliente_nombre as string | undefined)?.trim()
        if (!moto_id) return 'ERROR: el pedido NO se creó. Falta moto_id. Usa buscar_motos y vuelve a llamar crear_pedido con un id válido.'
        if (!cliente_nombre) return 'ERROR: el pedido NO se creó. Falta el nombre del cliente. Pide su nombre y vuelve a llamar crear_pedido.'
        const m = await detalleMoto(supabase, moto_id)
        if (!m) return 'ERROR: el pedido NO se creó. La moto no existe. Usa buscar_motos para ids válidos.'
        if (m.disponible <= 0) return `ERROR: el pedido NO se creó. La ${m.marca} ${m.modelo} no tiene unidades disponibles. Ofrece otra moto con buscar_motos.`
        const telefono = ((args.cliente_telefono as string | undefined)?.replace(/[\s.\-]/g, '') || ctx.telefono)
        const { id } = await crearPedido(supabase, {
          moto_id,
          cliente_nombre,
          cliente_telefono: telefono,
          precio_ofertado: typeof args.precio_ofertado === 'number' ? args.precio_ofertado : null,
          notas: (args.notas as string | undefined) ?? null,
        })
        return `OK: pedido creado (ref ${id.slice(0, 8)}) para ${cliente_nombre}: ${m.marca} ${m.modelo}. Un vendedor lo confirmará y coordinará el pago y la entrega.`
      }
      case 'estado_pedido': {
        const pend = await pedidosPendientesDe(supabase, ctx.telefono)
        if (pend.length === 0) return 'El cliente no tiene pedidos pendientes.'
        return JSON.stringify(pend)
      }
      case 'hablar_con_humano': {
        await pausarConversacion(supabase, ctx.telefono)
        return 'OK: conversación derivada a un vendedor humano. Dile al cliente que un asesor le escribirá enseguida.'
      }
      default:
        return `ERROR: herramienta desconocida "${name}".`
    }
  } catch (e) {
    return `ERROR: la operación falló (${String((e as Error).message ?? e)}). No confirmes éxito; informa al cliente que hubo un problema técnico.`
  }
}
