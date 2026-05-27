'use client'
import { useCartStore } from '@/lib/store/cartStore'
import { useMotoCartStore } from '@/lib/store/motoCartStore'
import type { CartItemRepuesto, CartItemMoto } from '@/lib/types'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'

interface RepuestoProps { item: CartItemRepuesto; mode: 'repuesto' }
interface MotoProps { item: CartItemMoto; mode: 'moto' }
type Props = RepuestoProps | MotoProps

export function CartItem({ item, mode }: Props) {
  const removeRepuesto = useCartStore(s => s.removeItem)
  const updateRepuesto = useCartStore(s => s.updateQuantity)
  const removeMoto = useMotoCartStore(s => s.removeItem)

  if (mode === 'repuesto') {
    const p = item as CartItemRepuesto
    return (
      <div className="flex items-center gap-3 py-2 border-b last:border-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{p.nombre}</p>
          <p className="text-xs text-slate-500">{p.codigo} · {formatBOB(p.precio_unitario)} c/u</p>
        </div>
        <Input
          type="number" min={1} max={p.stock} value={p.cantidad}
          onChange={e => updateRepuesto(p.producto_id, parseInt(e.target.value))}
          className="w-16 text-center text-sm"
        />
        <span className="w-20 text-right text-sm font-semibold">
          {formatBOB(p.precio_unitario * p.cantidad)}
        </span>
        <Button size="sm" variant="ghost" onClick={() => removeRepuesto(p.producto_id)}>
          <Trash2 size={14} className="text-red-400" />
        </Button>
      </div>
    )
  }

  const m = item as CartItemMoto
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{m.marca} {m.modelo} {m.anio}</p>
        <p className="text-xs text-slate-500">{m.codigo}</p>
      </div>
      <span className="text-sm font-semibold">{formatBOB(m.precio_unitario)}</span>
      <Button size="sm" variant="ghost" onClick={() => removeMoto(m.moto_id)}>
        <Trash2 size={14} className="text-red-400" />
      </Button>
    </div>
  )
}
