import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/dashboard/StatCard'
import { LowStockAlert } from '@/components/dashboard/LowStockAlert'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') redirect('/caja')

  const [{ data: stats }, { data: lowProductos }, { data: lowMotos }] = await Promise.all([
    supabase.rpc('get_dashboard_stats'),
    supabase.from('productos')
      .select('id, nombre, codigo, stock, stock_minimo')
      .filter('stock', 'lte', 'stock_minimo')
      .eq('activo', true),
    supabase.from('motos')
      .select('id, marca, modelo, stock, stock_minimo')
      .filter('stock', 'lte', 'stock_minimo')
      .eq('activo', true),
  ])

  const s = (stats ?? {}) as Record<string, number>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard — Hoy</h1>

      <section>
        <h2 className="text-lg font-semibold mb-3 text-slate-600">Repuestos</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Ventas" value={s.ventas_repuestos_hoy ?? 0} isCurrency highlight="blue" />
          <StatCard label="Ganancia neta" value={s.ganancia_repuestos_hoy ?? 0} isCurrency highlight="green" />
          <StatCard label="Transacciones" value={s.count_repuestos_hoy ?? 0} isCount />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 text-slate-600">Motos</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Ventas" value={s.ventas_motos_hoy ?? 0} isCurrency highlight="blue" />
          <StatCard label="Ganancia neta" value={s.ganancia_motos_hoy ?? 0} isCurrency highlight="green" />
          <StatCard label="Motos vendidas" value={s.count_motos_hoy ?? 0} isCount />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 text-slate-600">Total del día</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Ventas totales" value={s.total_hoy ?? 0} isCurrency highlight="blue" />
          <StatCard label="Ganancia combinada" value={s.ganancia_total_hoy ?? 0} isCurrency highlight="green" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 text-red-600">
          Alertas de Stock ({(lowProductos?.length ?? 0) + (lowMotos?.length ?? 0)})
        </h2>
        <LowStockAlert productos={lowProductos ?? []} motos={lowMotos ?? []} />
      </section>
    </div>
  )
}
