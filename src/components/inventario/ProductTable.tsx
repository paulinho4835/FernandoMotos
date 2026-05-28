'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Producto } from '@/lib/types'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Edit, PackagePlus, Check, X } from 'lucide-react'

interface Props {
  productos: Producto[]
  isAdmin?: boolean
}

export function ProductTable({ productos, isAdmin = false }: Props) {
  const router = useRouter()
  const [stockEntryId, setStockEntryId] = useState<string | null>(null)
  const [stockQty, setStockQty] = useState('')
  const [loadingEntry, setLoadingEntry] = useState(false)

  async function handleStockEntry(producto: Producto) {
    const qty = parseInt(stockQty)
    if (!qty || qty <= 0) return
    setLoadingEntry(true)
    const supabase = createClient()
    await supabase
      .from('productos')
      .update({ stock: producto.stock + qty, updated_at: new Date().toISOString() })
      .eq('id', producto.id)
    setStockEntryId(null)
    setStockQty('')
    setLoadingEntry(false)
    router.refresh()
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left p-3">Código</th>
            <th className="text-left p-3">Nombre</th>
            <th className="text-left p-3">Stock</th>
            {isAdmin && <th className="text-left p-3">Costo</th>}
            <th className="text-left p-3">P. Referencial</th>
            <th className="text-left p-3">P. Venta</th>
            <th className="text-left p-3">Ubicación</th>
            <th className="text-left p-3">Estado</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {productos.map(p => (
            <tr key={p.id} className="border-t hover:bg-slate-50">
              <td className="p-3 font-mono text-xs">{p.codigo}</td>
              <td className="p-3">
                <div>{p.nombre || <span className="text-slate-400 italic">Sin nombre</span>}</div>
                {(p.medida_interna || p.medida_externa || p.altura) && (
                  <div className="text-xs text-slate-400 mt-0.5">
                    {[
                      p.medida_interna && `Int: ${p.medida_interna}`,
                      p.medida_externa && `Ext: ${p.medida_externa}`,
                      p.altura && `Alt: ${p.altura}`,
                    ].filter(Boolean).join(' · ')}
                  </div>
                )}
              </td>
              <td className="p-3">
                {stockEntryId === p.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-xs">+</span>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Cant."
                      value={stockQty}
                      onChange={e => setStockQty(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleStockEntry(p); if (e.key === 'Escape') { setStockEntryId(null); setStockQty('') } }}
                      className="w-16 h-6 text-xs text-center"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={loadingEntry} onClick={() => handleStockEntry(p)}>
                      <Check size={12} className="text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setStockEntryId(null); setStockQty('') }}>
                      <X size={12} className="text-slate-400" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={p.stock <= p.stock_minimo && p.stock_minimo > 0 ? 'text-red-600 font-semibold' : ''}>
                      {p.stock}
                    </span>
                    {p.stock <= p.stock_minimo && p.stock_minimo > 0 && (
                      <Badge variant="destructive" className="text-xs">Crítico</Badge>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => { setStockEntryId(p.id); setStockQty('') }}
                        title="Entrada de stock"
                        className="text-slate-400 hover:text-green-600 transition-colors"
                      >
                        <PackagePlus size={14} />
                      </button>
                    )}
                  </div>
                )}
              </td>
              {isAdmin && (
                <td className="p-3 text-amber-700 font-medium">{formatBOB(p.costo)}</td>
              )}
              <td className="p-3 text-slate-500">
                {p.precio_referencial ? formatBOB(p.precio_referencial) : '—'}
              </td>
              <td className="p-3">{p.precio_venta ? formatBOB(p.precio_venta) : '—'}</td>
              <td className="p-3 text-slate-500">{p.ubicacion ?? '—'}</td>
              <td className="p-3">
                <Badge variant={p.activo ? 'default' : 'secondary'}>
                  {p.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </td>
              <td className="p-3">
                {isAdmin && (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/inventario/${p.id}/editar`}><Edit size={14} /></Link>
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {productos.length === 0 && (
            <tr><td colSpan={isAdmin ? 9 : 8} className="p-6 text-center text-slate-400">Sin productos</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
