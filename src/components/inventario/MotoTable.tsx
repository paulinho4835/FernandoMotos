'use client'
import type { Moto } from '@/lib/types'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Edit } from 'lucide-react'

interface Props { motos: Moto[] }

export function MotoTable({ motos }: Props) {
  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left p-3">Código</th>
            <th className="text-left p-3">Marca / Modelo</th>
            <th className="text-left p-3">Año</th>
            <th className="text-left p-3">Color</th>
            <th className="text-left p-3">Stock</th>
            <th className="text-left p-3">Precio</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {motos.map(m => (
            <tr key={m.id} className="border-t hover:bg-slate-50">
              <td className="p-3 font-mono text-xs">{m.codigo}</td>
              <td className="p-3">{m.marca} {m.modelo}</td>
              <td className="p-3">{m.anio ?? '—'}</td>
              <td className="p-3">{m.color ?? '—'}</td>
              <td className="p-3">
                <span className={m.stock <= m.stock_minimo ? 'text-red-600 font-semibold' : ''}>
                  {m.stock}
                </span>
                {m.stock <= m.stock_minimo && (
                  <Badge variant="destructive" className="ml-2 text-xs">Crítico</Badge>
                )}
              </td>
              <td className="p-3">{formatBOB(m.precio_venta)}</td>
              <td className="p-3">
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/inventario/motos/${m.id}/editar`}><Edit size={14} /></Link>
                </Button>
              </td>
            </tr>
          ))}
          {motos.length === 0 && (
            <tr><td colSpan={7} className="p-6 text-center text-slate-400">Sin motos</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
