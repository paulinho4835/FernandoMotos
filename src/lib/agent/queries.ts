import type { SupabaseClient } from '@supabase/supabase-js'

export type MotoResumen = {
  id: string
  marca: string
  modelo: string
  anio: number | null
  color: string | null
  motor_cc: number | null
  precio_venta: number
  disponible: number
}

export async function buscarMotos(
  supabase: SupabaseClient,
  f: { query?: string; marca?: string; modelo?: string; anio?: number; precio_min?: number; precio_max?: number },
): Promise<MotoResumen[]> {
  let q = supabase
    .from('motos')
    .select('id, marca, modelo, anio, color, motor_cc, precio_venta')
    .eq('activo', true)

  if (f.marca) q = q.ilike('marca', `%${f.marca}%`)
  if (f.modelo) q = q.ilike('modelo', `%${f.modelo}%`)
  if (typeof f.anio === 'number') q = q.eq('anio', f.anio)
  if (typeof f.precio_min === 'number') q = q.gte('precio_venta', f.precio_min)
  if (typeof f.precio_max === 'number') q = q.lte('precio_venta', f.precio_max)
  if (f.query) {
    const t = f.query.trim()
    q = q.or(`marca.ilike.%${t}%,modelo.ilike.%${t}%,descripcion.ilike.%${t}%`)
  }

  const { data: motos, error } = await q.limit(10)
  if (error) throw error
  if (!motos || motos.length === 0) return []

  const ids = motos.map((m) => m.id)
  const { data: disp } = await supabase
    .from('motos_disponibilidad')
    .select('moto_id, disponible')
    .in('moto_id', ids)
  const dispMap = new Map((disp ?? []).map((d) => [d.moto_id, d.disponible]))

  return motos.map((m) => ({
    id: m.id,
    marca: m.marca,
    modelo: m.modelo,
    anio: m.anio,
    color: m.color,
    motor_cc: m.motor_cc,
    precio_venta: m.precio_venta,
    disponible: dispMap.get(m.id) ?? 0,
  }))
}

export async function detalleMoto(supabase: SupabaseClient, motoId: string) {
  const { data: m, error } = await supabase
    .from('motos')
    .select('id, marca, modelo, anio, color, motor_cc, precio_venta, numero_motor, numero_chasis, descripcion, fotos')
    .eq('id', motoId)
    .eq('activo', true)
    .maybeSingle()
  if (error) throw error
  if (!m) return null
  const { data: disp } = await supabase
    .from('motos_disponibilidad')
    .select('disponible')
    .eq('moto_id', motoId)
    .maybeSingle()
  return {
    id: m.id, marca: m.marca, modelo: m.modelo, anio: m.anio, color: m.color,
    motor_cc: m.motor_cc, precio_venta: m.precio_venta,
    numero_motor: m.numero_motor, numero_chasis: m.numero_chasis,
    descripcion: m.descripcion, fotos: (m.fotos ?? []) as string[],
    disponible: disp?.disponible ?? 0,
  }
}

export async function crearPedido(
  supabase: SupabaseClient,
  d: { moto_id: string; cliente_nombre: string; cliente_telefono: string; precio_ofertado?: number | null; notas?: string | null },
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('pedidos')
    .insert({
      moto_id: d.moto_id,
      cliente_nombre: d.cliente_nombre,
      cliente_telefono: d.cliente_telefono,
      precio_ofertado: d.precio_ofertado ?? null,
      notas: d.notas ?? null,
      estado: 'pendiente',
      origen: 'whatsapp',
    })
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id }
}

export async function pedidosPendientesDe(supabase: SupabaseClient, telefono: string) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, estado, motos(marca, modelo)')
    .eq('cliente_telefono', telefono)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((p) => {
    const moto = p.motos as unknown as { marca: string; modelo: string } | null
    return { id: p.id, estado: p.estado, moto: moto ? `${moto.marca} ${moto.modelo}` : '—' }
  })
}

export async function agenteActivo(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from('configuracion')
    .select('agente_wa_activo')
    .eq('id', 1)
    .maybeSingle()
  return data?.agente_wa_activo === true
}
