import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CajaClient } from './CajaClient'

export default async function CajaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const [{ data: perfil }, { data: config }] = await Promise.all([
    supabase.from('perfiles').select('nombre, rol').eq('id', user.id).single(),
    supabase.from('configuracion').select('nombre_negocio').eq('id', 1).single(),
  ])

  return (
    <CajaClient
      vendedorId={user.id}
      vendedorNombre={perfil?.nombre ?? 'Vendedor'}
      isAdmin={perfil?.rol === 'admin'}
      negocioNombre={config?.nombre_negocio ?? 'Importadora de Motos Fernando'}
    />
  )
}
