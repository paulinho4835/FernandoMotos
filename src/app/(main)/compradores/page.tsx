import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { esAdmin } from '@/lib/auth/roles'
import { CompradoresClient, type Comprador } from '@/components/compradores/CompradoresClient'

export default async function CompradoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (!esAdmin(perfil?.rol)) redirect('/inventario')

  const { data: config } = await supabase
    .from('configuracion').select('modulo_compradores_activo').eq('id', 1).maybeSingle()
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
