import { createClient } from '@/lib/supabase/server'
import { getAuthUser, getPerfil, getConfiguracion } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import { esAdmin } from '@/lib/auth/roles'
import { CompradoresClient, type Comprador } from '@/components/compradores/CompradoresClient'

export default async function CompradoresPage() {
  const supabase = await createClient()
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const perfil = await getPerfil()
  if (!esAdmin(perfil?.rol)) redirect('/inventario')

  const config = await getConfiguracion()
  if (config?.modulo_compradores_activo !== true) redirect('/inventario')

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, cliente_nombre, cliente_telefono, precio_ofertado, adelanto, estado, origen, notas, created_at, motos(marca, modelo, precio_venta)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Compradores</h1>
      <CompradoresClient pedidos={(pedidos ?? []) as unknown as Comprador[]} />
    </div>
  )
}
