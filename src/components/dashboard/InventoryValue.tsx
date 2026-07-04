import { formatBOB } from '@/lib/utils/formatCurrency'
import { Package, Bike, TrendingUp } from 'lucide-react'

interface Props {
  costoProductos:    number
  valorProductos:    number
  unidadesProductos: number
  costoMotos:        number
  valorMotos:        number
  unidadesMotos:     number
}

export function InventoryValue({
  costoProductos, valorProductos, unidadesProductos,
  costoMotos, valorMotos, unidadesMotos,
}: Props) {
  const costoTotal = costoProductos + costoMotos
  const valorTotal = valorProductos + valorMotos
  const gananciaLatente = valorTotal - costoTotal

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-600">
            <Package size={16} />
            <span className="text-sm font-semibold">Repuestos</span>
            <span className="ml-auto text-xs text-slate-400">{unidadesProductos} unid.</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Costo invertido</span>
              <span className="font-medium">{formatBOB(costoProductos)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Valor a precio venta</span>
              <span className="font-semibold text-blue-600">{formatBOB(valorProductos)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-600">
            <Bike size={16} />
            <span className="text-sm font-semibold">Motos</span>
            <span className="ml-auto text-xs text-slate-400">{unidadesMotos} unid.</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Costo invertido</span>
              <span className="font-medium">{formatBOB(costoMotos)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Valor a precio venta</span>
              <span className="font-semibold text-blue-600">{formatBOB(valorMotos)}</span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <TrendingUp size={16} />
            <span className="text-sm font-semibold">Total inventario</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Capital invertido</span>
              <span className="font-medium">{formatBOB(costoTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Valor total</span>
              <span className="font-semibold text-blue-600">{formatBOB(valorTotal)}</span>
            </div>
            <div className="border-t pt-1 flex justify-between text-sm">
              <span className="text-slate-500">Ganancia potencial</span>
              <span className="font-bold text-green-600">{formatBOB(gananciaLatente)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
