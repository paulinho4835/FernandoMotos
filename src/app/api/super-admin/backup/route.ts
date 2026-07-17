import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { esSuperAdmin } from '@/lib/auth/roles'
import type { SupabaseClient } from '@supabase/supabase-js'

// Tablas críticas de venta: lo mínimo para no perder el historial comercial
// si hay que migrar el sistema. Deja fuera conversaciones_wa, pedidos del
// agente y config interna a propósito (ver decisión con el usuario).
const TABLAS = ['clientes', 'productos', 'motos', 'ventas', 'detalle_ventas'] as const

const PAGE_SIZE = 1000

async function fetchAll(supabase: SupabaseClient, tabla: string) {
  const filas: Record<string, unknown>[] = []
  let desde = 0
  for (;;) {
    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .range(desde, desde + PAGE_SIZE - 1)
    if (error) throw new Error(`${tabla}: ${error.message}`)
    filas.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) break
    desde += PAGE_SIZE
  }
  return filas
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('No autenticado', { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (!esSuperAdmin(perfil?.rol)) return new Response('No autorizado', { status: 403 })

  const admin = createAdminClient()
  const backup: Record<string, unknown[]> = {}
  for (const tabla of TABLAS) {
    backup[tabla] = await fetchAll(admin, tabla)
  }

  const ahora = new Date().toISOString()
  await admin.from('configuracion').update({ ultimo_backup_at: ahora }).eq('id', 1)

  const payload = {
    generado_en: ahora,
    tablas: TABLAS,
    data: backup,
  }

  const fecha = ahora.slice(0, 10)
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="backup-motos-fernando-${fecha}.json"`,
    },
  })
}
