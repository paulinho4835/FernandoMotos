import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/dashboard/StatCard'
import { LowStockAlert } from '@/components/dashboard/LowStockAlert'
import { SalesPeriodStats } from '@/components/dashboard/SalesPeriodStats'
import { InventoryValue } from '@/components/dashboard/InventoryValue'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') redirect('/inventario')

  const [
    { data: stats },
    { data: summary },
    { data: inventory },
    { data: allProductos },
    { data: allMotos },
  ] = await Promise.all([
    supabase.rpc('get_dashboard_stats'),
    supabase.rpc('get_sales_summary'),
    supabase.rpc('get_inventory_value'),
    supabase.from('productos')
      .select('id, nombre, codigo, stock, stock_minimo')
      .eq('activo', true),
    supabase.from('motos')
      .select('id, marca, modelo, stock, stock_minimo')
      .eq('activo', true),
  ])

  const lowProductos = allProductos?.filter(p => p.stock <= p.stock_minimo) ?? []
  const lowMotos = allMotos?.filter(m => m.stock <= m.stock_minimo) ?? []

  const s = (stats    ?? {}) as Record<string, number>
  const sm = (summary  ?? {}) as Record<string, number>
  const inv = (inventory ?? {}) as Record<string, number>

  return (
    <div className="p-4 md:p-6 space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* HOY */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-slate-600">Hoy</h2>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Repuestos</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Ventas" value={s.ventas_repuestos_hoy ?? 0} isCurrency highlight="blue" />
              <StatCard label="Ganancia neta" value={s.ganancia_repuestos_hoy ?? 0} isCurrency highlight="green" />
              <StatCard label="Transacciones" value={s.count_repuestos_hoy ?? 0} isCount />
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Motos</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Ventas" value={s.ventas_motos_hoy ?? 0} isCurrency highlight="blue" />
              <StatCard label="Ganancia neta" value={s.ganancia_motos_hoy ?? 0} isCurrency highlight="green" />
              <StatCard label="Motos vendidas" value={s.count_motos_hoy ?? 0} isCount />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Ventas totales hoy" value={s.total_hoy ?? 0} isCurrency highlight="blue" />
            <StatCard label="Ganancia combinada hoy" value={s.ganancia_total_hoy ?? 0} isCurrency highlight="green" />
          </div>
        </div>
      </section>

      {/* GANANCIAS POR PERÍODO */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-slate-600">Ganancias por período</h2>
        <SalesPeriodStats
          semana={{ ventas: sm.ventas_semana ?? 0, ganancia: sm.ganancia_semana ?? 0, count: sm.count_semana ?? 0 }}
          mes={{    ventas: sm.ventas_mes    ?? 0, ganancia: sm.ganancia_mes    ?? 0, count: sm.count_mes    ?? 0 }}
          total={{  ventas: sm.ventas_total  ?? 0, ganancia: sm.ganancia_total  ?? 0, count: sm.count_total  ?? 0 }}
        />
      </section>

      {/* VALOR DE MERCADERÍA */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-slate-600">Valor de mercadería en stock</h2>
        <InventoryValue
          costoProductos={inv.costo_productos ?? 0}
          valorProductos={inv.valor_productos ?? 0}
          unidadesProductos={inv.unidades_productos ?? 0}
          costoMotos={inv.costo_motos ?? 0}
          valorMotos={inv.valor_motos ?? 0}
          unidadesMotos={inv.unidades_motos ?? 0}
        />
      </section>

      {/* ALERTAS DE STOCK */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-red-600">
          Alertas de Stock ({(lowProductos?.length ?? 0) + (lowMotos?.length ?? 0)})
        </h2>
        <LowStockAlert productos={lowProductos ?? []} motos={lowMotos ?? []} />
      </section>
    </div>
  )
}
