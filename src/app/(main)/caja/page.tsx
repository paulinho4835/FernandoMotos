import { redirect } from 'next/navigation'
import { getAuthUser, getPerfil, getConfiguracion } from '@/lib/supabase/session'
import { CajaClient } from './CajaClient'
import { esAdmin } from '@/lib/auth/roles'

export default async function CajaPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const [perfil, config] = await Promise.all([getPerfil(), getConfiguracion()])

  return (
    <CajaClient
      vendedorId={user.id}
      vendedorNombre={perfil?.nombre ?? 'Vendedor'}
      isAdmin={esAdmin(perfil?.rol)}
      negocioNombre={config?.nombre_negocio ?? 'Importadora de Motos Fernando'}
      negocioDireccion={config?.direccion ?? ''}
      negocioTelefono={config?.telefono ?? ''}
    />
  )
}
