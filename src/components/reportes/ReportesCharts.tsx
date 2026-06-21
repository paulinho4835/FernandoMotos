'use client'

import {
  ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart,
} from 'recharts'
import { formatBOB } from '@/lib/utils/formatCurrency'

export interface ReportesData {
  ventas_por_dia: { dia: string; total: number; ganancia: number; count: number }[]
  top_productos: { nombre: string; cantidad: number; ingresos: number }[]
  por_tipo_mes: {
    repuestos: { total: number; ganancia: number; count: number }
    motos: { total: number; ganancia: number; count: number }
  }
}

function diaCorto(s: string) {
  // s = 'YYYY-MM-DD' → 'lun 18'
  const d = new Date(s + 'T00:00:00')
  return d.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' })
}

interface TooltipEntry { name: string; value: number; color: string }
interface CurrencyTooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string }

function CurrencyTooltip({ active, payload, label }: CurrencyTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatBOB(p.value)}
        </p>
      ))}
    </div>
  )
}

export function ReportesCharts({ data }: { data: ReportesData }) {
  const ventasDia = data.ventas_por_dia.map(d => ({ ...d, label: diaCorto(d.dia) }))
  const top = data.top_productos.map(p => ({
    ...p,
    nombre: p.nombre.length > 22 ? p.nombre.slice(0, 21) + '…' : p.nombre,
  }))

  const rep = data.por_tipo_mes.repuestos
  const mot = data.por_tipo_mes.motos
  const totalMes = rep.total + mot.total
  const pct = (n: number) => (totalMes > 0 ? Math.round((n / totalMes) * 100) : 0)

  return (
    <div className="space-y-8">
      {/* Ventas y ganancia últimos 14 días */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
          Ventas y ganancia — últimos 14 días
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={ventasDia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} width={70}
              tickFormatter={(v) => formatBOB(v).replace('Bs', '').trim()} />
            <Tooltip content={<CurrencyTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="total" name="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Line dataKey="ganancia" name="Ganancia" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top productos */}
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
            Repuestos más vendidos (por cantidad)
          </h2>
          {top.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">Aún no hay ventas de repuestos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, top.length * 38)}>
              <BarChart data={top} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                <YAxis type="category" dataKey="nombre" width={150} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'ingresos' ? [formatBOB(value), 'Ingresos'] : [value, 'Unidades']
                  }
                />
                <Bar dataKey="cantidad" name="Unidades" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Comparativa repuestos vs motos (mes) */}
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
            Repuestos vs Motos — este mes
          </h2>
          <div className="space-y-5">
            <TipoBar label="Repuestos" color="#3b82f6" total={rep.total} count={rep.count} pct={pct(rep.total)} />
            <TipoBar label="Motos" color="#f59e0b" total={mot.total} count={mot.count} pct={pct(mot.total)} />
            <div className="border-t pt-4 flex justify-between text-sm">
              <span className="text-slate-500">Total del mes</span>
              <span className="font-bold">{formatBOB(totalMes)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function TipoBar({ label, color, total, count, pct }: {
  label: string; color: string; total: number; count: number; pct: number
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{formatBOB(total)}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="text-xs text-slate-400 mt-1">{count} {count === 1 ? 'venta' : 'ventas'} · {pct}%</p>
    </div>
  )
}
