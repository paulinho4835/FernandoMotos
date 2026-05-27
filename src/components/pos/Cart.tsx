'use client'
import { useCartStore } from '@/lib/store/cartStore'
import { useMotoCartStore } from '@/lib/store/motoCartStore'
import type { TipoVenta } from '@/lib/types'
import { CartItem } from './CartItem'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { ShoppingCart } from 'lucide-react'

interface Props { mode: TipoVenta }

export function Cart({ mode }: Props) {
  const repuestoItems = useCartStore(s => s.items)
  const repuestoTotal = useCartStore(s => s.total)
  const motoItems = useMotoCartStore(s => s.items)
  const motoTotal = useMotoCartStore(s => s.total)

  const items = mode === 'repuesto' ? repuestoItems : motoItems
  const total = mode === 'repuesto' ? repuestoTotal() : motoTotal()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-400">
        <ShoppingCart size={32} />
        <p className="text-sm mt-2">Carrito vacío</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="max-h-96 overflow-auto">
        {mode === 'repuesto'
          ? repuestoItems.map(item => <CartItem key={item.producto_id} item={item} mode="repuesto" />)
          : motoItems.map(item => <CartItem key={item.moto_id} item={item} mode="moto" />)
        }
      </div>
      <div className="border-t pt-2 flex justify-between font-bold">
        <span>Total</span>
        <span>{formatBOB(total)}</span>
      </div>
    </div>
  )
}
