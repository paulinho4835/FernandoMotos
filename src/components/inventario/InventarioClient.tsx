'use client'
import { useState, useMemo } from 'react'
import type { Producto, Categoria } from '@/lib/types'
import { useCartStore } from '@/lib/store/cartStore'
import { ProductTable } from './ProductTable'
import { CheckoutModal } from '@/components/pos/CheckoutModal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Search, ShoppingCart, X, Trash2 } from 'lucide-react'

interface Props {
  productos: Producto[]
  categorias: Categoria[]
  isAdmin: boolean
  vendedorId: string
  vendedorNombre: string
}

export function InventarioClient({ productos, categorias, isAdmin, vendedorId, vendedorNombre }: Props) {
  const [activeTab, setActiveTab] = useState<string>('todos')
  const [search, setSearch] = useState('')
  const [filterMedInt, setFilterMedInt] = useState('')
  const [filterMedExt, setFilterMedExt] = useState('')
  const [filterAltura, setFilterAltura] = useState('')

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
        (p.medida_interna ?? '').toLowerCase().includes(q) ||
        (p.medida_externa ?? '').toLowerCase().includes(q) ||
        (p.altura ?? '').toLowerCase().includes(q) ||
        p.compatibilidad.some(c => c.toLowerCase().includes(q))
      )
    }

    if (filterMedInt.trim()) {
      const q = filterMedInt.toLowerCase().trim()
      list = list.filter(p => (p.medida_interna ?? '').toLowerCase().includes(q))
    }
    if (filterMedExt.trim()) {
      const q = filterMedExt.toLowerCase().trim()
      list = list.filter(p => (p.medida_externa ?? '').toLowerCase().includes(q))
    }
    if (filterAltura.trim()) {
      const q = filterAltura.toLowerCase().trim()
      list = list.filter(p => (p.altura ?? '').toLowerCase().includes(q))
    }

    return list
  }, [productos, activeTab, search, filterMedInt, filterMedExt, filterAltura])

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
          {(search || filterMedInt || filterMedExt || filterAltura) && (
            <p className="text-sm text-slate-500">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Filtrar por medidas:</span>
          <div className="relative">
            <Input
              placeholder="Med. interna"
              value={filterMedInt}
              onChange={e => setFilterMedInt(e.target.value)}
              className="w-32 h-8 text-xs pr-6"
            />
            {filterMedInt && (
              <button onClick={() => setFilterMedInt('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              placeholder="Med. externa"
              value={filterMedExt}
              onChange={e => setFilterMedExt(e.target.value)}
              className="w-32 h-8 text-xs pr-6"
            />
            {filterMedExt && (
              <button onClick={() => setFilterMedExt('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              placeholder="Altura"
              value={filterAltura}
              onChange={e => setFilterAltura(e.target.value)}
              className="w-28 h-8 text-xs pr-6"
            />
            {filterAltura && (
              <button onClick={() => setFilterAltura('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <Tab active={activeTab === 'todos'} onClick={() => setActiveTab('todos')}>
          Todos ({productos.length})
        </Tab>
        {categoriasCon.map(c => {
          const count = productos.filter(p => p.categoria_id === c.id).length
          return (
            <Tab key={c.id} active={activeTab === c.id} onClick={() => setActiveTab(c.id)}>
              {c.nombre} ({count})
            </Tab>
          )
        })}
        {sinCategoria > 0 && (
          <Tab active={activeTab === 'sin_categoria'} onClick={() => setActiveTab('sin_categoria')}>
            Sin categoría ({sinCategoria})
          </Tab>
        )}
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
        <div className="fixed bottom-6 left-[15rem] right-6 z-30">
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
      />
    </div>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
      }`}
    >
      {children}
    </button>
  )
}
