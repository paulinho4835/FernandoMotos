'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { Download, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

type DetalleRepuesto = { cantidad: number; productos: { nombre: string } | null }
type DetalleMoto = { cantidad: number; marca: string | null; modelo: string | null }
type VentaExport = {
  id: string
  created_at: string
  tipo_venta: string
  total: number
  ganancia_neta: number
  metodo_pago: string
  estado: string
  perfiles: { nombre: string } | null
  clientes: { nombre: string } | null
  detalle_ventas: DetalleRepuesto[] | null
  detalle_ventas_motos: DetalleMoto[] | null
}

function todayBOT() {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().split('T')[0]
}
function firstDayOfMonthBOT() {
  const hoy = new Date(Date.now() - 4 * 60 * 60 * 1000)
  return `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, '0')}-01`
}
function addDays(d: string, n: number) {
  const dt = new Date(d + 'T00:00:00Z')
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().split('T')[0]
}
function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

export function ExportarCSV() {
  const hoy = todayBOT()
  const [desde, setDesde] = useState(firstDayOfMonthBOT)
  const [hasta, setHasta] = useState(hoy)
  const [cargando, setCargando] = useState(false)
  const [abierto, setAbierto] = useState(false)

  async function handleExportar() {
    if (desde > hasta) {
      toast.error('La fecha "Desde" no puede ser mayor que "Hasta"')
      return
    }
    setCargando(true)
    const supabase = createClient()

    const utcDesde = desde + 'T04:00:00.000Z'
    const utcHastaExcl = addDays(hasta, 1) + 'T04:00:00.000Z'

    const { data, error } = await supabase
      .from('ventas')
      .select(`
        id, created_at, tipo_venta, total, ganancia_neta, metodo_pago, estado,
        perfiles(nombre),
        clientes(nombre),
        detalle_ventas(cantidad, productos(nombre)),
        detalle_ventas_motos(cantidad, marca, modelo)
      `)
      .gte('created_at', utcDesde)
      .lt('created_at', utcHastaExcl)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error(`Error al exportar: ${error.message}`)
      setCargando(false)
      return
    }

    if (!data || data.length === 0) {
      toast.info('No hay ventas en ese rango de fechas')
      setCargando(false)
      return
    }

    const ventas = data as unknown as VentaExport[]

    const headers = [
      'Fecha', 'Hora', 'Tipo', 'Vendedor', 'Cliente',
      'Detalle', 'Total (Bs.)', 'Ganancia (Bs.)', 'Método pago', 'Estado',
    ]
    const rows = ventas.map(v => {
      const dtBOT = new Date(new Date(v.created_at).getTime() - 4 * 60 * 60 * 1000)
      const fecha = dtBOT.toISOString().split('T')[0]
      const hora = dtBOT.toISOString().split('T')[1].slice(0, 5)
      const vendedor = v.perfiles?.nombre ?? ''
      const cliente = v.clientes?.nombre ?? ''

      let detalle = ''
      if (v.tipo_venta === 'repuesto' && v.detalle_ventas) {
        detalle = v.detalle_ventas
          .map(d => `${d.cantidad}x ${d.productos?.nombre ?? ''}`)
          .join(' | ')
      } else if (v.tipo_venta === 'moto' && v.detalle_ventas_motos) {
        detalle = v.detalle_ventas_motos
          .map(d => `${d.cantidad}x ${d.marca ?? ''} ${d.modelo ?? ''}`.trim())
          .join(' | ')
      }

      return [fecha, hora, v.tipo_venta, vendedor, cliente, detalle,
        v.total, v.ganancia_neta, v.metodo_pago, v.estado]
        .map(csvEscape).join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    // BOM ﻿ para que Excel abra con tildes correctas
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ventas_${desde}_al_${hasta}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${ventas.length} venta${ventas.length !== 1 ? 's' : ''} exportada${ventas.length !== 1 ? 's' : ''}`)
    setCargando(false)
  }

  return (
    <div className="rounded-xl border bg-white">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
        onClick={() => setAbierto(prev => !prev)}
      >
        <span className="flex items-center gap-2">
          <Download size={15} />
          Exportar ventas a CSV
        </span>
        {abierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {abierto && (
        <div className="px-4 pb-4 flex flex-wrap items-end gap-3 border-t pt-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Desde</label>
            <Input type="date" value={desde} max={hoy} onChange={e => setDesde(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Hasta</label>
            <Input type="date" value={hasta} max={hoy} onChange={e => setHasta(e.target.value)} className="w-40" />
          </div>
          <Button onClick={handleExportar} disabled={cargando} className="gap-2">
            <Download size={15} />
            {cargando ? 'Generando...' : 'Descargar CSV'}
          </Button>
          <p className="text-xs text-slate-400 self-end pb-1">Incluye todas las ventas del período (activas, devueltas y anuladas).</p>
        </div>
      )}
    </div>
  )
}
