import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SalesTable } from '@/components/historial/SalesTable'

export default async function HistorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('perfiles').select('rol').eq('id', user!.id).single()

  const query = supabase
    .from('ventas')
    .select('*, clientes(nombre), perfiles(nombre)')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: ventas } = perfil?.rol === 'admin'
    ? await query
    : await query.eq('vendedor_id', user!.id)

  const all = ventas ?? []
  const repuestos = all.filter(v => v.tipo_venta === 'repuesto')
  const motos = all.filter(v => v.tipo_venta === 'moto')

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Historial de Ventas</h1>
      <Tabs defaultValue="total">
        <TabsList>
          <TabsTrigger value="total">Total ({all.length})</TabsTrigger>
          <TabsTrigger value="repuestos">Repuestos ({repuestos.length})</TabsTrigger>
          <TabsTrigger value="motos">Motos ({motos.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="total"><SalesTable ventas={all} /></TabsContent>
        <TabsContent value="repuestos"><SalesTable ventas={repuestos} /></TabsContent>
        <TabsContent value="motos"><SalesTable ventas={motos} /></TabsContent>
      </Tabs>
    </div>
  )
}
