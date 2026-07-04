'use client'
import { useState } from 'react'
import type { TipoVenta } from '@/lib/types'
import { ModeToggle } from '@/components/pos/ModeToggle'
import { ProductSearch } from '@/components/pos/ProductSearch'
import { MotoSearch } from '@/components/pos/MotoSearch'
import { Cart } from '@/components/pos/Cart'
import { CheckoutModal } from '@/components/pos/CheckoutModal'
import { useCartStore } from '@/lib/store/cartStore'
import { useMotoCartStore } from '@/lib/store/motoCartStore'
import { Button } from '@/components/ui/button'
import { Toaster } from 'sonner'

interface Props {
  vendedorId: string
  vendedorNombre: string
  isAdmin: boolean
  negocioNombre: string
  negocioDireccion: string
  negocioTelefono: string
}

export function CajaClient({ vendedorId, vendedorNombre, isAdmin, negocioNombre, negocioDireccion, negocioTelefono }: Props) {
  const [mode, setMode] = useState<TipoVenta>('repuesto')
  const [showCheckout, setShowCheckout] = useState(false)
  const repuestoItems = useCartStore(s => s.items)
  const motoItems = useMotoCartStore(s => s.items)

  const hasItems = mode === 'repuesto' ? repuestoItems.length > 0 : motoItems.length > 0

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <Toaster />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Caja</h1>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {mode === 'repuesto' ? <ProductSearch /> : <MotoSearch />}

      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-3 text-slate-700">
          {mode === 'repuesto' ? 'Carrito — Repuestos' : 'Carrito — Motos'}
        </h2>
        <Cart mode={mode} />
      </div>

      <Button
        className="w-full"
        size="lg"
        disabled={!hasItems}
        onClick={() => setShowCheckout(true)}
      >
        Cobrar
      </Button>

      <CheckoutModal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        mode={mode}
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
