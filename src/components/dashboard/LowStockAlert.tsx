import type { Producto } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface Props {
  productos: Pick<Producto, 'id' | 'nombre' | 'codigo' | 'stock' | 'stock_minimo'>[]
}

export function LowStockAlert({ productos }: Props) {
  if (productos.length === 0) return (
    <div className="text-sm text-slate-400 text-center py-4">Sin alertas de stock</div>
  )
  return (
    <div className="space-y-2">
      {productos.map(p => (
        <div key={p.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded p-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">{p.nombre}</p>
              <p className="text-xs text-slate-500">{p.codigo} · Repuesto</p>
            </div>
          </div>
          <Badge variant="destructive">Stock: {p.stock} / Mín: {p.stock_minimo}</Badge>
        </div>
      ))}
    </div>
  )
}
