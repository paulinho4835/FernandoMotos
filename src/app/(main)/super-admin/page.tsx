import { getAuthUser, getPerfil, getConfiguracion } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import { esSuperAdmin } from '@/lib/auth/roles'
import { SuperAdminClient } from '@/components/super-admin/SuperAdminClient'

export default async function SuperAdminPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const perfil = await getPerfil()
  if (!esSuperAdmin(perfil?.rol)) redirect('/inventario')

  const config = await getConfiguracion()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Super Admin</h1>
      <SuperAdminClient
        moduloInicial={config?.modulo_compradores_activo ?? false}
        pedidosInicial={config?.modulo_pedidos_activo ?? true}
        agenteWaVisibleInicial={config?.modulo_agente_wa_visible ?? true}
        fotosMotosInicial={config?.modulo_fotos_motos_activo ?? false}
        ultimoBackupInicial={config?.ultimo_backup_at ?? null}
      />
    </div>
  )
}
