import { getAuthUser, getPerfil, getConfiguracion } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import { MotoForm } from '@/components/inventario/MotoForm'
import { esAdmin } from '@/lib/auth/roles'

export default async function NuevaMotoPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const perfil = await getPerfil()
  if (!esAdmin(perfil?.rol)) redirect('/inventario/motos')
  const config = await getConfiguracion()

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Registrar Moto</h1>
      <MotoForm fotosActivo={config?.modulo_fotos_motos_activo ?? false} />
    </div>
  )
}
