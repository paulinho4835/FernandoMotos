import { createClient } from '@/lib/supabase/server'
import { PedidosClient } from '@/components/pedidos/PedidosClient'

export default async function PedidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = user
    ? await supabase.from('perfiles').select('rol, nombre').eq('id', user.id).single()
    : { data: null }

  const [{ data: pedidos }, { data: vendedores }] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id, cantidad, cliente_nombre, cliente_telefono, precio_ofertado, estado, notas, created_at, motos(id, marca, modelo, anio, precio_venta)')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false }),
    supabase.from('vendedores').select('*').eq('activo', true).order('nombre'),
  ])

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Pedidos pendientes</h1>
      <PedidosClient
        pedidos={(pedidos as never) ?? []}
        vendedores={vendedores ?? []}
        vendedorNombre={perfil?.nombre ?? 'Vendedor'}
      />
    </div>
  )
}
