import type { Venta } from '@/lib/types'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Badge } from '@/components/ui/badge'

interface Props { ventas: Venta[] }

export function SalesTable({ ventas }: Props) {
  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left p-3">Fecha</th>
            <th className="text-left p-3">Tipo</th>
            <th className="text-left p-3">Cliente</th>
            <th className="text-left p-3">Vendedor</th>
            <th className="text-right p-3">Total</th>
            <th className="text-right p-3">Ganancia</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map(v => (
            <tr key={v.id} className="border-t hover:bg-slate-50">
              <td className="p-3 text-slate-500 text-xs">
                {new Date(v.created_at).toLocaleString('es-BO')}
              </td>
              <td className="p-3">
                <Badge variant={v.tipo_venta === 'moto' ? 'default' : 'secondary'}>
                  {v.tipo_venta === 'moto' ? 'Moto' : 'Repuesto'}
                </Badge>
              </td>
              <td className="p-3">{v.clientes?.nombre ?? <span className="text-slate-400">—</span>}</td>
              <td className="p-3">{v.perfiles?.nombre}</td>
              <td className="p-3 text-right font-semibold">{formatBOB(v.total)}</td>
              <td className="p-3 text-right text-green-600">{formatBOB(v.ganancia_neta)}</td>
            </tr>
          ))}
          {ventas.length === 0 && (
            <tr><td colSpan={6} className="p-6 text-center text-slate-400">Sin ventas</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
