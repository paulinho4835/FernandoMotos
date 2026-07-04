'use client'
import { useState, useMemo } from 'react'
import type { Producto, Categoria } from '@/lib/types'
import { useCartStore } from '@/lib/store/cartStore'
import { ProductTable } from './ProductTable'
import { CheckoutModal } from '@/components/pos/CheckoutModal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Search, ShoppingCart, X, Trash2 } from 'lucide-react'

interface Props {
  productos: Producto[]
  categorias: Categoria[]
  isAdmin: boolean
  vendedorId: string
  vendedorNombre: string
  negocioNombre: string
  negocioDireccion: string
  negocioTelefono: string
}

export function InventarioClient({ productos, categorias, isAdmin, vendedorId, vendedorNombre, negocioNombre, negocioDireccion, negocioTelefono }: Props) {
  const [activeTab, setActiveTab] = useState<string>('todos')
  const [search, setSearch] = useState('')
  const [filterMedida, setFilterMedida] = useState('')

  // Pending product for adding to cart
  const [pending, setPending] = useState<Producto | null>(null)
  const [pendingPrecio, setPendingPrecio] = useState('')
  const [pendingCantidad, setPendingCantidad] = useState('1')

  // Checkout modal
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  // Cart store
  const cartItems = useCartStore(s => s.items)
  const cartTotal = useCartStore(s => s.total)
  const addItem = useCartStore(s => s.addItem)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const clearCart = useCartStore(s => s.clear)

  function handleAddToCart(p: Producto) {
    if (p.stock <= 0) {
      alert(`"${p.nombre || p.codigo}" no tiene stock disponible.`)
      return
    }
    setPending(p)
    setPendingPrecio(p.precio_referencial?.toString() ?? (p.precio_venta ? p.precio_venta.toString() : ''))
    setPendingCantidad('1')
  }

  function confirmAdd() {
    if (!pending) return
    const precio = parseFloat(pendingPrecio)
    const cantidad = parseInt(pendingCantidad) || 1
    if (!precio || precio <= 0) return
    addItem({
      producto_id: pending.id,
      codigo: pending.codigo,
      nombre: pending.nombre,
      medida: pending.medida,
      precio_unitario: precio,
      costo_unitario: pending.costo,
      stock: pending.stock,
    })
    if (cantidad > 1) updateQuantity(pending.id, cantidad)
    setPending(null)
  }

  function cancelPending() {
    setPending(null)
    setPendingPrecio('')
    setPendingCantidad('1')
  }

  const filtered = useMemo(() => {
    let list = productos

    if (activeTab === 'sin_categoria') {
      list = list.filter(p => !p.categoria_id)
    } else if (activeTab !== 'todos') {
      list = list.filter(p => p.categoria_id === activeTab)
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(p =>
        p.codigo.toLowerCase().includes(q) ||
        (p.nombre ?? '').toLowerCase().includes(q) ||
        (p.descripcion ?? '').toLowerCase().includes(q) ||
        (p.medida ?? '').toLowerCase().includes(q) ||
        p.compatibilidad.some(c => c.toLowerCase().includes(q))
      )
    }

    if (filterMedida.trim()) {
      const q = filterMedida.toLowerCase().trim()
      list = list.filter(p => (p.medida ?? '').toLowerCase().includes(q))
    }

    return list
  }, [productos, activeTab, search, filterMedida])

  const sinCategoria = productos.filter(p => !p.categoria_id).length
  const categoriasCon = categorias.filter(c => productos.some(p => p.categoria_id === c.id))
  const itemCount = cartItems.length

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar código, nombre, compatibilidad..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {(search || filterMedida) && (
            <p className="text-sm text-slate-500">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Filtrar por medida:</span>
          <div className="relative">
            <Input
              placeholder="ej: 14cm"
              value={filterMedida}
              onChange={e => setFilterMedida(e.target.value)}
              className="w-32 h-8 text-xs pr-6"
            />
            {filterMedida && (
              <button onClick={() => setFilterMedida('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full sm:max-w-xs">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos ({productos.length})</SelectItem>
            {categoriasCon.map(c => {
              const count = productos.filter(p => p.categoria_id === c.id).length
              return (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre} ({count})
                </SelectItem>
              )
            })}
            {sinCategoria > 0 && (
              <SelectItem value="sin_categoria">Sin categoría ({sinCategoria})</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Panel de precio al seleccionar producto */}
      {pending && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-sm">{pending.nombre || pending.codigo}</p>
              <p className="text-xs text-slate-500">{pending.codigo} · Stock disponible: {pending.stock}</p>
            </div>
            <button onClick={cancelPending} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-600">Precio de venta (Bs.)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder={pending.precio_referencial ? `Ref: ${pending.precio_referencial}` : 'Ingrese precio'}
                value={pendingPrecio}
                onChange={e => setPendingPrecio(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') cancelPending() }}
                className="h-9"
                autoFocus
              />
            </div>
            <div className="w-24 space-y-1">
              <label className="text-xs font-medium text-slate-600">Cantidad</label>
              <Input
                type="number"
                min="1"
                max={pending.stock}
                value={pendingCantidad}
                onChange={e => setPendingCantidad(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') cancelPending() }}
                className="h-9 text-center"
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

      <ProductTable productos={filtered} isAdmin={isAdmin} onAddToCart={handleAddToCart} />

      {/* Barra flotante del carrito */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-[15rem] md:right-6 z-30">
          <div className="bg-slate-900 text-white rounded-xl px-5 py-3 flex items-center justify-between shadow-2xl max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <ShoppingCart size={18} />
              <span className="font-medium">
                {itemCount} producto{itemCount !== 1 ? 's' : ''}
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
        mode="repuesto"
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
