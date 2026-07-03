'use client'
import { useState, useMemo } from 'react'
import type { Venta } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SalesTable } from '@/components/historial/SalesTable'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { ShoppingBag, TrendingUp, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ExportarCSV } from '@/components/historial/ExportarCSV'

// Bolivia is UTC-4 (no DST)
function todayBOT() {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().split('T')[0]
}
function dateBOT(s: string) {
  return new Date(new Date(s).getTime() - 4 * 60 * 60 * 1000).toISOString().split('T')[0]
}
function addDays(d: string, n: number) {
  const dt = new Date(d + 'T00:00:00Z')
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().split('T')[0]
}
function labelFecha(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-BO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

interface Props {
  ventas: Venta[]
  isAdmin: boolean
}

export function HistorialClient({ ventas: ventasIniciales, isAdmin }: Props) {
  const hoy = todayBOT()
  const [fechaDesde, setFechaDesde] = useState(hoy)
  const [fechaHasta, setFechaHasta] = useState(hoy)
  const [ventas, setVentas] = useState(ventasIniciales)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [devolviendoId, setDevolviendoId] = useState<string | null>(null)

  function handleFechaDesde(v: string) {
    const val = v || hoy
    setFechaDesde(val)
    if (val > fechaHasta) setFechaHasta(val)
  }
  function handleFechaHasta(v: string) {
    const val = v || hoy
    setFechaHasta(val)
    if (val < fechaDesde) setFechaDesde(val)
  }
  function setRango(desde: string, hasta: string) {
    setFechaDesde(desde)
    setFechaHasta(hasta)
  }

  const delDia = useMemo(
    () => ventas.filter(v => {
      const f = dateBOT(v.created_at)
      return f >= fechaDesde && f <= fechaHasta
    }),
    [ventas, fechaDesde, fechaHasta]
  )
  const repuestos = delDia.filter(v => v.tipo_venta === 'repuesto')
  const motos = delDia.filter(v => v.tipo_venta === 'moto')

  // Las ventas devueltas o anuladas no cuentan para los totales del día.
  const inactiva = (v: typeof ventas[number]) => v.estado === 'devuelta' || v.estado === 'anulada'
  const totalDia = delDia.reduce((s, v) => s + (inactiva(v) ? 0 : v.total ?? 0), 0)
  const gananciaDia = delDia.reduce((s, v) => s + (inactiva(v) ? 0 : v.ganancia_neta ?? 0), 0)

  const quick = [
    { label: 'Hoy', desde: hoy, hasta: hoy },
    { label: 'Ayer', desde: addDays(hoy, -1), hasta: addDays(hoy, -1) },
    { label: 'Antes de ayer', desde: addDays(hoy, -2), hasta: addDays(hoy, -2) },
    { label: 'Últimos 7 días', desde: addDays(hoy, -6), hasta: hoy },
    { label: 'Últimos 30 días', desde: addDays(hoy, -29), hasta: hoy },
  ]

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta venta? Se restaurará el stock de los productos.')) return
    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.rpc('eliminar_venta', { p_venta_id: id })
    if (error) {
      toast.error(`Error al eliminar: ${error.message}`)
    } else {
      setVentas(prev => prev.filter(v => v.id !== id))
      toast.success('Venta eliminada y stock restaurado')
    }
    setDeletingId(null)
  }

  async function handleDevolver(id: string) {
    if (!confirm('¿Registrar la devolución de esta venta? Se restaurará el stock y la venta no contará en los totales ni reportes.')) return
    setDevolviendoId(id)
    const supabase = createClient()
    const { error } = await supabase.rpc('devolver_venta', { p_venta_id: id })
    if (error) {
      toast.error(`Error al devolver: ${error.message}`)
    } else {
      setVentas(prev => prev.map(v =>
        v.id === id ? { ...v, estado: 'devuelta', devuelta_at: new Date().toISOString() } : v
      ))
      toast.success('Devolución registrada y stock restaurado')
    }
    setDevolviendoId(null)
  }

  return (
    <div className="space-y-6">
      {/* Filtro de fecha */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Desde</label>
          <Input
            type="date"
            value={fechaDesde}
            max={hoy}
            onChange={e => handleFechaDesde(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Hasta</label>
          <Input
            type="date"
            value={fechaHasta}
            max={hoy}
            onChange={e => handleFechaHasta(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {quick.map(q => (
            <Button
              key={q.label}
              variant={fechaDesde === q.desde && fechaHasta === q.hasta ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRango(q.desde, q.hasta)}
            >
              {q.label}
            </Button>
          ))}
        </div>
        <p className="text-sm text-slate-500 ml-auto capitalize">
          {fechaDesde === fechaHasta ? labelFecha(fechaDesde) : `${labelFecha(fechaDesde)} — ${labelFecha(fechaHasta)}`}
        </p>
      </div>

      {/* Exportar CSV — solo admin */}
      {isAdmin && <ExportarCSV />}

      {/* Resumen del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
          <div className="bg-blue-100 rounded-lg p-2">
            <ShoppingBag size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Ventas</p>
            <p className="text-2xl font-bold">{delDia.length}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
          <div className="bg-slate-100 rounded-lg p-2">
            <DollarSign size={20} className="text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold">{formatBOB(totalDia)}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
            <div className="bg-green-100 rounded-lg p-2">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Ganancia</p>
              <p className="text-2xl font-bold text-green-600">{formatBOB(gananciaDia)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs por tipo */}
      <Tabs defaultValue="total">
        <TabsList>
          <TabsTrigger value="total">Total ({delDia.length})</TabsTrigger>
          <TabsTrigger value="repuestos">Repuestos ({repuestos.length})</TabsTrigger>
          <TabsTrigger value="motos">Motos ({motos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="total" className="mt-4">
          <SalesTable ventas={delDia} isAdmin={isAdmin} onDelete={isAdmin ? handleDelete : undefined} deletingId={deletingId} onDevolver={isAdmin ? handleDevolver : undefined} devolviendoId={devolviendoId} />
        </TabsContent>
        <TabsContent value="repuestos" className="mt-4">
          <SalesTable ventas={repuestos} isAdmin={isAdmin} onDelete={isAdmin ? handleDelete : undefined} deletingId={deletingId} onDevolver={isAdmin ? handleDevolver : undefined} devolviendoId={devolviendoId} />
        </TabsContent>
        <TabsContent value="motos" className="mt-4">
          <SalesTable ventas={motos} isAdmin={isAdmin} onDelete={isAdmin ? handleDelete : undefined} deletingId={deletingId} onDevolver={isAdmin ? handleDevolver : undefined} devolviendoId={devolviendoId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
