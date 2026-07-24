import { createClient } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/supabase/session'
import { HistorialClient } from '@/components/historial/HistorialClient'
import { esAdmin } from '@/lib/auth/roles'

export default async function HistorialPage() {
  const supabase = await createClient()
  const perfil = await getPerfil()
  const isAdmin = esAdmin(perfil?.rol)

  const { data: ventas } = await supabase
    .from('ventas')
    .select('*, clientes(nombre), perfiles(nombre, email), detalle_ventas(cantidad, productos(nombre)), detalle_ventas_motos(cantidad, marca, modelo, numero_chasis, numero_motor, proveedor)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Ventas</h1>
      <HistorialClient ventas={ventas ?? []} isAdmin={isAdmin} />
    </div>
  )
}
