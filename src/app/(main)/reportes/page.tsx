import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportesCharts, type ReportesData } from '@/components/reportes/ReportesCharts'

export default async function ReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') redirect('/inventario')

  const { data } = await supabase.rpc('get_reportes_data')

  const reportes = (data ?? {
    ventas_por_dia: [],
    top_productos: [],
    por_tipo_mes: {
      repuestos: { total: 0, ganancia: 0, count: 0 },
      motos: { total: 0, ganancia: 0, count: 0 },
    },
  }) as ReportesData

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Reportes</h1>
      <ReportesCharts data={reportes} />
    </div>
  )
}
