import type { Venta } from '@/lib/types'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Undo2 } from 'lucide-react'

interface Props {
  ventas: Venta[]
  title?: string
  isAdmin?: boolean
  onDelete?: (id: string) => void
  deletingId?: string | null
  onDevolver?: (id: string) => void
  devolviendoId?: string | null
}

function detalleText(v: Venta): string {
  const parts: string[] = []
  for (const d of v.detalle_ventas ?? []) {
    if (d.productos?.nombre) parts.push(`${d.cantidad}× ${d.productos.nombre}`)
  }
  for (const d of v.detalle_ventas_motos ?? []) {
    if (d.marca) parts.push(`${d.cantidad}× ${d.marca} ${d.modelo}`)
  }
  return parts.join(', ')
}

function esInactiva(v: Venta) {
  return v.estado === 'devuelta' || v.estado === 'anulada'
}

export function SalesTable({ ventas, title, isAdmin, onDelete, deletingId, onDevolver, devolviendoId }: Props) {
  // Las ventas devueltas o anuladas no suman en los totales.
  const totalVentas = ventas.reduce((s, v) => s + (esInactiva(v) ? 0 : v.total ?? 0), 0)
  const totalGanancia = ventas.reduce((s, v) => s + (esInactiva(v) ? 0 : v.ganancia_neta ?? 0), 0)
  const extraCols = isAdmin ? 2 : 0 // ganancia + acciones
  const cols = 6 + extraCols

  return (
    <div className="space-y-2">
      {title && (
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-2">{title}</h3>
      )}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">Detalle</th>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Vendedor</th>
              <th className="text-right p-3">Total</th>
              {isAdmin && <th className="text-right p-3">Ganancia</th>}
              {isAdmin && <th className="p-3" />}
            </tr>
          </thead>
          <tbody>
            {ventas.map(v => {
              const inactiva = esInactiva(v)
              return (
              <tr key={v.id} className={`border-t hover:bg-slate-50 ${inactiva ? 'bg-red-50/40 text-slate-400' : ''}`}>
                <td className="p-3 text-slate-500 text-xs">
                  {new Date(v.created_at).toLocaleString('es-BO')}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={v.tipo_venta === 'moto' ? 'default' : 'secondary'}>
                      {v.tipo_venta === 'moto' ? 'Moto' : 'Repuesto'}
                    </Badge>
                    {v.estado === 'devuelta' && <Badge variant="destructive">Devuelta</Badge>}
                    {v.estado === 'anulada' && <Badge variant="destructive">Anulada</Badge>}
                  </div>
                </td>
                <td className="p-3 max-w-xs text-slate-700">{detalleText(v) || <span className="text-slate-400">—</span>}</td>
                <td className="p-3">{v.clientes?.nombre ?? <span className="text-slate-400">—</span>}</td>
                <td className="p-3">{v.vendedor_nombre ?? v.perfiles?.nombre ?? <span className="text-slate-400">—</span>}</td>
                <td className={`p-3 text-right font-semibold ${inactiva ? 'line-through' : ''}`}>{formatBOB(v.total)}</td>
                {isAdmin && (
                  <td className={`p-3 text-right ${inactiva ? 'line-through' : 'text-green-600'}`}>{formatBOB(v.ganancia_neta)}</td>
                )}
                {isAdmin && (onDelete || onDevolver) && (
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      {onDevolver && !inactiva && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2"
                          onClick={() => onDevolver(v.id)}
                          disabled={devolviendoId === v.id}
                          title="Registrar devolución"
                        >
                          <Undo2 size={15} />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                          onClick={() => onDelete(v.id)}
                          disabled={deletingId === v.id}
                          title="Eliminar venta"
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )})}
            {ventas.length === 0 && (
              <tr><td colSpan={cols} className="p-6 text-center text-slate-400">Sin ventas</td></tr>
            )}
          </tbody>
          {ventas.length > 0 && (
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-semibold text-sm">
              <tr>
                <td colSpan={5} className="p-3 text-slate-600">
                  Total ({ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'})
                </td>
                <td className="p-3 text-right">{formatBOB(totalVentas)}</td>
                {isAdmin && (
                  <td className="p-3 text-right text-green-700">{formatBOB(totalGanancia)}</td>
                )}
                {isAdmin && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
