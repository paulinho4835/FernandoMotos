import type { SupabaseClient } from '@supabase/supabase-js'
import { type AgentConfig, type AgentTool, createHandoffTool } from '@paulo/agent-core'
import { buscarMotos, detalleMoto, crearPedido, pedidosPendientesDe, registrarAdelanto } from './queries'

function buildSystemPrompt(opts: { negocio: string; phoneVerified: boolean }): string {
  return [
    `Eres el asesor de ventas por WhatsApp de "${opts.negocio}", una importadora de motos en Bolivia.`,
    'Hablas en español neutro, cordial y breve (mensajes cortos, aptos para WhatsApp). Sin voseo: usa "puedes", "quieres".',
    '',
    'REGLAS CRÍTICAS:',
    '1. Solo vendes MOTOS. Si preguntan por repuestos u otra cosa, deriva con hablar_con_humano.',
    '2. NUNCA inventes precios, stock ni especificaciones. Llama SIEMPRE a buscar_motos o detalle_moto antes de afirmar algo del catálogo.',
    '3. Para registrar interés de compra usa crear_pedido. Antes DEBES tener el nombre del cliente; si no lo tienes, pídelo.',
    '4. Solo confirma éxito si el resultado de la herramienta lo dice explícitamente (empieza con "OK:"). Si un resultado empieza con "ERROR:", NO inventes confirmación: informa el problema o pide el dato que falta.',
    '5. Aclara siempre que un vendedor humano confirmará el pedido y coordinará el pago y la entrega. Tú no cobras ni reservas la moto físicamente.',
    '6. No prometas financiamiento, envíos ni descuentos que no estén confirmados por un humano.',
    '7. Para registrar un adelanto/depósito usa registrar_adelanto, SOLO si el cliente menciona un monto. Nunca inventes un adelanto ni asumas que dejó dinero.',
    opts.phoneVerified
      ? ''
      : '8. No tienes el número de celular del cliente. Pídelo antes de crear un pedido y pásalo como cliente_telefono.',
    '',
    'Cuando muestres motos, resume: marca, modelo, año, precio y si hay disponibilidad. No muestres ids internos al cliente.',
  ].filter(Boolean).join('\n')
}

export function buildAgentConfig(supabase: SupabaseClient): AgentConfig {
  const buscarMotosTool: AgentTool = {
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
    execute: async (args) => {
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
    },
  }

  const detalleMotoTool: AgentTool = {
    name: 'detalle_moto',
    description: 'Devuelve las especificaciones completas de una moto por su id.',
    parameters: {
      type: 'object',
      properties: { moto_id: { type: 'string' } },
      required: ['moto_id'],
    },
    execute: async (args) => {
      const id = args.moto_id as string | undefined
      if (!id) return 'ERROR: falta moto_id. Vuelve a llamar detalle_moto con el id de una moto de buscar_motos.'
      const m = await detalleMoto(supabase, id)
      if (!m) return 'ERROR: no se encontró esa moto. No inventes datos; usa buscar_motos para obtener ids válidos.'
      return JSON.stringify(m)
    },
  }

  const crearPedidoTool: AgentTool = {
    name: 'crear_pedido',
    description: 'Crea un pedido pendiente de una moto para que un vendedor lo confirme. Requiere el nombre del cliente.',
    parameters: {
      type: 'object',
      properties: {
        moto_id: { type: 'string' },
        cliente_nombre: { type: 'string' },
        cliente_telefono: { type: 'string', description: 'Opcional; por defecto el número de WhatsApp del cliente' },
        precio_ofertado: { type: 'number' },
        adelanto: { type: 'number', description: 'Opcional; adelanto/depósito que el cliente dejará' },
        notas: { type: 'string' },
      },
      required: ['moto_id', 'cliente_nombre'],
    },
    isAction: true,
    execute: async (args, ctx) => {
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
        adelanto: typeof args.adelanto === 'number' ? args.adelanto : null,
        notas: (args.notas as string | undefined) ?? null,
      })
      return `OK: pedido creado (ref ${id.slice(0, 8)}) para ${cliente_nombre}: ${m.marca} ${m.modelo}. Un vendedor lo confirmará y coordinará el pago y la entrega.`
    },
  }

  const registrarAdelantoTool: AgentTool = {
    name: 'registrar_adelanto',
    description: 'Registra el adelanto (depósito) sobre el pedido pendiente más reciente del cliente. Úsalo SOLO si el cliente menciona un monto de adelanto.',
    parameters: {
      type: 'object',
      properties: {
        monto: { type: 'number', description: 'Monto del adelanto en bolivianos' },
        cliente_telefono: { type: 'string', description: 'Opcional; por defecto el número de WhatsApp del cliente' },
      },
      required: ['monto'],
    },
    isAction: true,
    execute: async (args, ctx) => {
      const monto = typeof args.monto === 'number' ? args.monto : NaN
      if (!Number.isFinite(monto) || monto <= 0) {
        return 'ERROR: el adelanto NO se registró. Falta un monto válido. Pregunta cuánto dejará de adelanto y vuelve a llamar registrar_adelanto.'
      }
      const telefono = ((args.cliente_telefono as string | undefined)?.replace(/[\s.\-]/g, '') || ctx.telefono)
      const { ok, moto } = await registrarAdelanto(supabase, { telefono, monto })
      if (!ok) {
        return 'ERROR: el adelanto NO se registró porque no encontré un pedido pendiente de este cliente. Crea primero el pedido con crear_pedido y luego registra el adelanto.'
      }
      return `OK: adelanto de ${monto} Bs registrado${moto ? ` para ${moto}` : ''}. Un vendedor confirmará el pedido y coordinará el saldo.`
    },
  }

  const estadoPedidoTool: AgentTool = {
    name: 'estado_pedido',
    description: 'Lista los pedidos pendientes del cliente actual.',
    parameters: { type: 'object', properties: {} },
    execute: async (_args, ctx) => {
      const pend = await pedidosPendientesDe(supabase, ctx.telefono)
      if (pend.length === 0) return 'El cliente no tiene pedidos pendientes.'
      return JSON.stringify(pend)
    },
  }

  return {
    negocio: 'Importadora de Motos Fernando',
    buildSystemPrompt: ({ negocio, meta }) =>
      buildSystemPrompt({ negocio, phoneVerified: meta.phoneVerified !== 'false' }),
    tools: [buscarMotosTool, detalleMotoTool, crearPedidoTool, registrarAdelantoTool, estadoPedidoTool, createHandoffTool()],
  }
}
