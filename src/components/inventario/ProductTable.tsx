'use client'
import type { Producto } from '@/lib/types'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Edit } from 'lucide-react'

interface Props {
  productos: Producto[]
  isAdmin?: boolean
}

export function ProductTable({ productos, isAdmin = false }: Props) {
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
                <div>{p.nombre}</div>
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
                <span className={p.stock <= p.stock_minimo ? 'text-red-600 font-semibold' : ''}>
                  {p.stock}
                </span>
                {p.stock <= p.stock_minimo && (
                  <Badge variant="destructive" className="ml-2 text-xs">Crítico</Badge>
                )}
              </td>
              {isAdmin && (
                <td className="p-3 text-amber-700 font-medium">{formatBOB(p.costo)}</td>
              )}
              <td className="p-3 text-slate-500">
                {p.precio_referencial ? formatBOB(p.precio_referencial) : '—'}
              </td>
              <td className="p-3">{formatBOB(p.precio_venta)}</td>
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
