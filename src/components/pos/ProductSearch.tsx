'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/store/cartStore'
import type { Producto } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Search, X, ShoppingCart } from 'lucide-react'

export function ProductSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Producto[]>([])
  const [pending, setPending] = useState<Producto | null>(null)
  const [precio, setPrecio] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const addItem = useCartStore(s => s.addItem)
  const updateQuantity = useCartStore(s => s.updateQuantity)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('productos')
      .select('id, codigo, nombre, descripcion, costo, precio_venta, precio_referencial, medida, stock, stock_minimo, ubicacion, compatibilidad, categoria_id, activo, created_at, updated_at')
      .eq('activo', true)
      .or(`codigo.ilike.%${q}%,nombre.ilike.%${q}%`)
      .order('nombre')
      .limit(8)
    setResults(data ?? [])
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    const w = window as Window & { __searchTimer?: ReturnType<typeof setTimeout> }
    clearTimeout(w.__searchTimer)
    w.__searchTimer = setTimeout(() => search(e.target.value), 300)
  }

  function selectProduct(p: Producto) {
    if (p.stock <= 0) {
      alert(`"${p.nombre || p.codigo}" no tiene stock disponible.`)
      return
    }
    setPending(p)
    setPrecio(p.precio_referencial?.toString() ?? p.precio_venta?.toString() ?? '')
    setCantidad('1')
    setQuery('')
    setResults([])
  }

  function confirmAdd() {
    if (!pending) return
    const precioNum = parseFloat(precio)
    const cantNum = parseInt(cantidad) || 1
    if (!precioNum || precioNum <= 0) return
    addItem({
      producto_id: pending.id,
      codigo: pending.codigo,
      nombre: pending.nombre,
      medida: pending.medida,
      precio_unitario: precioNum,
      costo_unitario: pending.costo,
      stock: pending.stock,
    })
    if (cantNum > 1) updateQuantity(pending.id, cantNum)
    setPending(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') confirmAdd()
    if (e.key === 'Escape') setPending(null)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por código o nombre..."
          value={query}
          onChange={handleChange}
          className="pl-9"
        />
        {results.length > 0 && (
          <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-64 overflow-auto">
            {results.map(p => (
              <button key={p.id} onClick={() => selectProduct(p)}
                disabled={p.stock <= 0}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                <div>
                  <p className="font-medium text-sm">{p.nombre || p.codigo}</p>
                  <p className="text-xs text-slate-500">
                    {p.codigo} · Stock: {p.stock}
                    {p.stock <= 0 && <span className="text-red-500 font-medium"> · Sin stock</span>}
                    {p.medida && <> · {p.medida}</>}
                  </p>
                </div>
                {p.precio_referencial && (
                  <p className="text-xs text-slate-400 shrink-0 ml-2">Ref: {formatBOB(p.precio_referencial)}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {pending && (
        <div className="border border-blue-200 rounded-md p-3 bg-blue-50 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">{pending.nombre || pending.codigo}</p>
              <p className="text-xs text-slate-500">{pending.codigo} · Stock: {pending.stock}</p>
            </div>
            <button onClick={() => setPending(null)} className="text-slate-400 hover:text-slate-600 mt-0.5">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-600">Precio de venta (Bs.)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder={pending.precio_referencial ? `Referencial: ${pending.precio_referencial}` : 'Ingrese precio'}
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="w-20 space-y-1">
              <label className="text-xs font-medium text-slate-600">Cantidad</label>
              <Input
                type="number"
                min="1"
                max={pending.stock}
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm text-center"
              />
            </div>
            <Button
              size="sm"
              onClick={confirmAdd}
              disabled={!precio || parseFloat(precio) <= 0}
              className="h-8"
            >
              <ShoppingCart size={14} className="mr-1" />
              Agregar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
