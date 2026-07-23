import { getAuthUser, getPerfil, getConfiguracion } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import { ConfiguracionForm } from '@/components/configuracion/ConfiguracionForm'
import { AgenteWAPanel } from '@/components/configuracion/AgenteWAPanel'
import { esAdmin } from '@/lib/auth/roles'

export default async function ConfiguracionPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const perfil = await getPerfil()
  if (!esAdmin(perfil?.rol)) redirect('/inventario')

  const config = await getConfiguracion()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <ConfiguracionForm
        nombreInicial={config?.nombre_negocio ?? 'Importadora de Motos Fernando'}
        direccionInicial={config?.direccion ?? ''}
        telefonoInicial={config?.telefono ?? ''}
      />
      {config?.modulo_agente_wa_visible !== false && (
        <div className="max-w-lg">
          <AgenteWAPanel activoInicial={config?.agente_wa_activo ?? false} />
        </div>
      )}
    </div>
  )
}
