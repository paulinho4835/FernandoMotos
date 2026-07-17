import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { esSuperAdmin } from '@/lib/auth/roles'
import { SuperAdminClient } from '@/components/super-admin/SuperAdminClient'

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (!esSuperAdmin(perfil?.rol)) redirect('/inventario')

  const { data: config } = await supabase
    .from('configuracion')
    .select('modulo_compradores_activo, modulo_pedidos_activo, modulo_agente_wa_visible, ultimo_backup_at')
    .eq('id', 1).maybeSingle()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Super Admin</h1>
      <SuperAdminClient
        moduloInicial={config?.modulo_compradores_activo ?? false}
        pedidosInicial={config?.modulo_pedidos_activo ?? true}
        agenteWaVisibleInicial={config?.modulo_agente_wa_visible ?? true}
        ultimoBackupInicial={config?.ultimo_backup_at ?? null}
      />
    </div>
  )
}
