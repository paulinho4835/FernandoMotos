import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SalesTable } from '@/components/historial/SalesTable'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { ShoppingBag, TrendingUp, DollarSign } from 'lucide-react'

// Bolivia is UTC-4 (no DST)
function getTodayBOT() {
  const now = new Date()
  const bot = new Date(now.getTime() - 4 * 60 * 60 * 1000)
  return bot.toISOString().split('T')[0] // YYYY-MM-DD
}

function isToday(dateStr: string) {
  const d = new Date(new Date(dateStr).getTime() - 4 * 60 * 60 * 1000)
  return d.toISOString().split('T')[0] === getTodayBOT()
}

export default async function HistorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('perfiles').select('rol').eq('id', user!.id).single()
  const isAdmin = perfil?.rol === 'admin'

  const { data: ventas } = await supabase
    .from('ventas')
    .select('*, clientes(nombre), perfiles(nombre, email)')
    .order('created_at', { ascending: true })

  const all = ventas ?? []
  const hoy = all.filter(v => isToday(v.created_at))
  const anteriores = all.filter(v => !isToday(v.created_at))

  const repuestosHoy = hoy.filter(v => v.tipo_venta === 'repuesto')
  const motosHoy = hoy.filter(v => v.tipo_venta === 'moto')
  const repuestosAnt = anteriores.filter(v => v.tipo_venta === 'repuesto')
  const motosAnt = anteriores.filter(v => v.tipo_venta === 'moto')

  const totalHoy = hoy.reduce((s, v) => s + (v.total ?? 0), 0)
  const gananciaHoy = hoy.reduce((s, v) => s + (v.ganancia_neta ?? 0), 0)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Ventas</h1>

      {/* Resumen del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
          <div className="bg-blue-100 rounded-lg p-2">
            <ShoppingBag size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Ventas hoy</p>
            <p className="text-2xl font-bold">{hoy.length}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
          <div className="bg-slate-100 rounded-lg p-2">
            <DollarSign size={20} className="text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total hoy</p>
            <p className="text-2xl font-bold">{formatBOB(totalHoy)}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
            <div className="bg-green-100 rounded-lg p-2">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Ganancia hoy</p>
              <p className="text-2xl font-bold text-green-600">{formatBOB(gananciaHoy)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="total">
        <TabsList>
          <TabsTrigger value="total">Total ({isAdmin ? all.length : hoy.length})</TabsTrigger>
          <TabsTrigger value="repuestos">Repuestos ({isAdmin ? repuestosHoy.length + repuestosAnt.length : repuestosHoy.length})</TabsTrigger>
          <TabsTrigger value="motos">Motos ({isAdmin ? motosHoy.length + motosAnt.length : motosHoy.length})</TabsTrigger>

        </TabsList>

        <TabsContent value="total" className="space-y-6 mt-4">
          <SalesTable ventas={hoy} title="Ventas de hoy" isAdmin={isAdmin} />
          {isAdmin && anteriores.length > 0 && (
            <SalesTable ventas={anteriores} title="Ventas anteriores" isAdmin={isAdmin} />
          )}
        </TabsContent>

        <TabsContent value="repuestos" className="space-y-6 mt-4">
          <SalesTable ventas={repuestosHoy} title="Ventas de hoy" isAdmin={isAdmin} />
          {isAdmin && repuestosAnt.length > 0 && (
            <SalesTable ventas={repuestosAnt} title="Ventas anteriores" isAdmin={isAdmin} />
          )}
        </TabsContent>

        <TabsContent value="motos" className="space-y-6 mt-4">
          <SalesTable ventas={motosHoy} title="Ventas de hoy" isAdmin={isAdmin} />
          {isAdmin && motosAnt.length > 0 && (
            <SalesTable ventas={motosAnt} title="Ventas anteriores" isAdmin={isAdmin} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
