'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/store/cartStore'
import type { Producto } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Search } from 'lucide-react'

export function ProductSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Producto[]>([])
  const addItem = useCartStore(s => s.addItem)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('productos')
      .select('*')
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

  function select(p: Producto) {
    addItem({
      producto_id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      precio_unitario: p.precio_venta,
      costo_unitario: p.costo,
      stock: p.stock,
    })
    setQuery('')
    setResults([])
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por código o nombre..."
          value={query}
          onChange={handleChange}
          className="pl-9"
        />
      </div>
      {results.length > 0 && (
        <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-64 overflow-auto">
          {results.map(p => (
            <button key={p.id} onClick={() => select(p)}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{p.nombre}</p>
                <p className="text-xs text-slate-500">{p.codigo} · Stock: {p.stock}</p>
              </div>
              <span className="text-sm font-semibold">{formatBOB(p.precio_venta)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
