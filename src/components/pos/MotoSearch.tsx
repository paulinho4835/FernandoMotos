'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMotoCartStore } from '@/lib/store/motoCartStore'
import type { Moto } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Search } from 'lucide-react'

export function MotoSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Moto[]>([])
  const addItem = useMotoCartStore(s => s.addItem)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('motos')
      .select('*')
      .eq('activo', true)
      .gt('stock', 0)
      .or(`codigo.ilike.%${q}%,marca.ilike.%${q}%,modelo.ilike.%${q}%`)
      .order('marca')
      .limit(8)
    setResults(data ?? [])
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    const w = window as Window & { __searchTimerMoto?: ReturnType<typeof setTimeout> }
    clearTimeout(w.__searchTimerMoto)
    w.__searchTimerMoto = setTimeout(() => search(e.target.value), 300)
  }

  function select(m: Moto) {
    addItem({
      moto_id: m.id,
      codigo: m.codigo,
      marca: m.marca,
      modelo: m.modelo,
      anio: m.anio,
      precio_unitario: m.precio_venta,
      costo_unitario: m.costo,
      stock: m.stock,
    })
    setQuery('')
    setResults([])
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por código, marca o modelo..."
          value={query}
          onChange={handleChange}
          className="pl-9"
        />
      </div>
      {results.length > 0 && (
        <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-64 overflow-auto">
          {results.map(m => (
            <button key={m.id} onClick={() => select(m)}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{m.marca} {m.modelo} {m.anio}</p>
                <p className="text-xs text-slate-500">{m.codigo} · Stock: {m.stock}</p>
              </div>
              <span className="text-sm font-semibold">{formatBOB(m.precio_venta)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
