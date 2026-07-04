import { StatCard } from './StatCard'

interface Props {
  semana: { ventas: number; ganancia: number; count: number }
  mes:    { ventas: number; ganancia: number; count: number }
  total:  { ventas: number; ganancia: number; count: number }
}

export function SalesPeriodStats({ semana, mes, total }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Esta semana</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Ventas" value={semana.ventas} isCurrency highlight="blue" />
          <StatCard label="Ganancia neta" value={semana.ganancia} isCurrency highlight="green" />
          <StatCard label="Transacciones" value={semana.count} isCount />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Este mes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Ventas" value={mes.ventas} isCurrency highlight="blue" />
          <StatCard label="Ganancia neta" value={mes.ganancia} isCurrency highlight="green" />
          <StatCard label="Transacciones" value={mes.count} isCount />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Histórico total</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Ventas" value={total.ventas} isCurrency highlight="blue" />
          <StatCard label="Ganancia neta" value={total.ganancia} isCurrency highlight="green" />
          <StatCard label="Transacciones" value={total.count} isCount />
        </div>
      </div>
    </div>
  )
}
