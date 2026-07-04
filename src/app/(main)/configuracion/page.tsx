import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfiguracionForm } from '@/components/configuracion/ConfiguracionForm'
import { AgenteWAPanel } from '@/components/configuracion/AgenteWAPanel'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') redirect('/inventario')

  const { data: config } = await supabase
    .from('configuracion').select('nombre_negocio, direccion, telefono, agente_wa_activo').eq('id', 1).single()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <ConfiguracionForm
        nombreInicial={config?.nombre_negocio ?? 'Importadora de Motos Fernando'}
        direccionInicial={config?.direccion ?? ''}
        telefonoInicial={config?.telefono ?? ''}
      />
      <div className="max-w-lg">
        <AgenteWAPanel activoInicial={config?.agente_wa_activo ?? false} />
      </div>
    </div>
  )
}
