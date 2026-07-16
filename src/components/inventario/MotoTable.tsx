'use client'
import type { Moto } from '@/lib/types'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Edit, ShoppingCart, Bike } from 'lucide-react'

interface Props {
  motos: Moto[]
  isAdmin?: boolean
  onAddToCart?: (m: Moto) => void
  disponibilidad?: Record<string, { reservado: number; disponible: number }>
}

export function MotoTable({ motos, isAdmin = false, onAddToCart, disponibilidad }: Props) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="p-3 w-14" />
            <th className="text-left p-3">Tipo/CC</th>
            <th className="text-left p-3">Marca</th>
            <th className="text-left p-3">Color</th>
            <th className="text-left p-3">Año</th>
            <th className="text-left p-3">Chasis</th>
            <th className="text-left p-3">Motor</th>
            <th className="text-left p-3">Ubicación</th>
            <th className="text-left p-3">Precio de Venta</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {motos.map(m => (
            <tr key={m.id} className="border-t hover:bg-slate-50">
              <td className="p-3">
                {m.fotos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.fotos[0]} alt={`${m.marca} ${m.modelo}`} className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-300">
                    <Bike size={18} />
                  </div>
                )}
              </td>
              <td className="p-3">
                {m.modelo}
                {disponibilidad?.[m.id] && disponibilidad[m.id].reservado > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">Reservada</Badge>
                )}
              </td>
              <td className="p-3">{m.marca}</td>
              <td className="p-3">{m.color ?? '—'}</td>
              <td className="p-3">{m.anio ?? '—'}</td>
              <td className="p-3 font-mono text-xs">{m.numero_chasis ?? '—'}</td>
              <td className="p-3 font-mono text-xs">{m.numero_motor ?? '—'}</td>
              <td className="p-3">{m.ubicacion ?? '—'}</td>
              <td className="p-3">{formatBOB(m.precio_venta)}</td>
              <td className="p-3">
                <div className="flex items-center gap-1">
                  {onAddToCart && (
                    <Button size="sm" variant="ghost" title="Vender moto" onClick={() => onAddToCart(m)}>
                      <ShoppingCart size={14} className="text-green-600" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/inventario/motos/${m.id}/editar`}><Edit size={14} /></Link>
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {motos.length === 0 && (
            <tr><td colSpan={10} className="p-6 text-center text-slate-400">Sin motos</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
