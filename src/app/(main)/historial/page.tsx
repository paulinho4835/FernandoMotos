import { createClient } from '@/lib/supabase/server'
import { HistorialClient } from '@/components/historial/HistorialClient'
import { esAdmin } from '@/lib/auth/roles'

export default async function HistorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('perfiles').select('rol').eq('id', user!.id).single()
  const isAdmin = esAdmin(perfil?.rol)

  const { data: ventas } = await supabase
    .from('ventas')
    .select('*, clientes(nombre), perfiles(nombre, email), detalle_ventas(cantidad, productos(nombre)), detalle_ventas_motos(cantidad, marca, modelo)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Ventas</h1>
      <HistorialClient ventas={ventas ?? []} isAdmin={isAdmin} />
    </div>
  )
}
