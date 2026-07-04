'use client'
import { useState } from 'react'
import type { Moto } from '@/lib/types'
import { useMotoCartStore } from '@/lib/store/motoCartStore'
import { MotoTable } from './MotoTable'
import { CheckoutModal } from '@/components/pos/CheckoutModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { ShoppingCart, X, Trash2 } from 'lucide-react'

interface Props {
  motos: Moto[]
  isAdmin: boolean
  vendedorId: string
  vendedorNombre: string
  negocioNombre: string
  negocioDireccion: string
  negocioTelefono: string
  disponibilidad?: Record<string, { reservado: number; disponible: number }>
}

export function MotosClient({ motos, isAdmin, vendedorId, vendedorNombre, negocioNombre, negocioDireccion, negocioTelefono, disponibilidad }: Props) {
  const [pending, setPending] = useState<Moto | null>(null)
  const [pendingPrecio, setPendingPrecio] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const cartItems = useMotoCartStore(s => s.items)
  const cartTotal = useMotoCartStore(s => s.total)
  const addItem = useMotoCartStore(s => s.addItem)
  const clearCart = useMotoCartStore(s => s.clear)

  function handleAddToCart(m: Moto) {
    setPending(m)
    setPendingPrecio(m.precio_venta?.toString() ?? '')
  }

  function confirmAdd() {
    if (!pending) return
    const precio = parseFloat(pendingPrecio)
    if (!precio || precio <= 0) return
    addItem({
      moto_id: pending.id,
      codigo: pending.codigo,
      marca: pending.marca,
      modelo: pending.modelo,
      anio: pending.anio,
      precio_unitario: precio,
      costo_unitario: pending.costo,
      stock: pending.stock,
    })
    setPending(null)
    setPendingPrecio('')
  }

  function cancelPending() {
    setPending(null)
    setPendingPrecio('')
  }

  const itemCount = cartItems.length

  return (
    <div className="space-y-4 pb-24">
      {pending && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-sm">{pending.marca} {pending.modelo} {pending.anio ?? ''}</p>
              <p className="text-xs text-slate-500">{pending.codigo} · Stock disponible: {pending.stock}</p>
            </div>
            <button onClick={cancelPending} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-600">Precio de venta (Bs.) — Ref: {formatBOB(pending.precio_venta)}</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Ingrese precio"
                value={pendingPrecio}
                onChange={e => setPendingPrecio(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') cancelPending() }}
                className="h-9"
                autoFocus
              />
            </div>
            <Button
              onClick={confirmAdd}
              disabled={!pendingPrecio || parseFloat(pendingPrecio) <= 0}
              className="h-9"
            >
              <ShoppingCart size={15} className="mr-1.5" />
              Agregar
            </Button>
          </div>
        </div>
      )}

      <MotoTable motos={motos} isAdmin={isAdmin} onAddToCart={handleAddToCart} disponibilidad={disponibilidad} />

      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-[15rem] md:right-6 z-30">
          <div className="bg-slate-900 text-white rounded-xl px-5 py-3 flex items-center justify-between shadow-2xl max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <ShoppingCart size={18} />
              <span className="font-medium">
                {itemCount} moto{itemCount !== 1 ? 's' : ''}
              </span>
              <span className="text-slate-400">·</span>
              <span className="font-bold text-lg">{formatBOB(cartTotal())}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-white h-8"
                onClick={() => clearCart()}
                title="Vaciar carrito"
              >
                <Trash2 size={14} />
              </Button>
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white h-8 px-4"
                onClick={() => setCheckoutOpen(true)}
              >
                Finalizar venta
              </Button>
            </div>
          </div>
        </div>
      )}

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        mode="moto"
        vendedorId={vendedorId}
        vendedorNombre={vendedorNombre}
        isAdmin={isAdmin}
        negocioNombre={negocioNombre}
        negocioDireccion={negocioDireccion}
        negocioTelefono={negocioTelefono}
      />
    </div>
  )
}
