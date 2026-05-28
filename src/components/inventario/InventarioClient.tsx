'use client'
import { useState, useMemo } from 'react'
import type { Producto, Categoria } from '@/lib/types'
import { ProductTable } from './ProductTable'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface Props {
  productos: Producto[]
  categorias: Categoria[]
  isAdmin: boolean
}

export function InventarioClient({ productos, categorias, isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<string>('todos')
  const [search, setSearch] = useState('')

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
        p.nombre.toLowerCase().includes(q) ||
        (p.descripcion ?? '').toLowerCase().includes(q) ||
        p.compatibilidad.some(c => c.toLowerCase().includes(q))
      )
    }

    return list
  }, [productos, activeTab, search])

  const sinCategoria = productos.filter(p => !p.categoria_id).length
  const categoriasCon = categorias.filter(c => productos.some(p => p.categoria_id === c.id))

  return (
    <div className="space-y-4">
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
        {search && (
          <p className="text-sm text-slate-500">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
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

      <ProductTable productos={filtered} isAdmin={isAdmin} />
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
