'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Moto } from '@/lib/types'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Edit, ShoppingCart, Bike, Trash2, Images } from 'lucide-react'
import { FotosLightbox } from './FotosLightbox'

interface Props {
  motos: Moto[]
  isAdmin?: boolean
  onAddToCart?: (m: Moto) => void
  disponibilidad?: Record<string, { reservado: number; disponible: number }>
  costos?: Record<string, number>
}

export function MotoTable({ motos, isAdmin = false, onAddToCart, disponibilidad, costos }: Props) {
  const router = useRouter()
  const [motoFotos, setMotoFotos] = useState<Moto | null>(null)

  async function handleDelete(m: Moto) {
    if (!confirm(`¿Eliminar "${m.marca} ${m.modelo}" (chasis: ${m.numero_chasis ?? 's/n'})? Esta acción no se puede deshacer.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('motos').delete().eq('id', m.id)
    if (error) {
      if (error.code === '23503') {
        alert('No se puede eliminar: esta moto tiene una venta o un pedido registrado que la referencia.')
      } else {
        alert(`No se pudo eliminar: ${error.message}`)
      }
      return
    }
    router.refresh()
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm table-fixed">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="p-3 w-14" />
            <th className="text-left p-3 whitespace-nowrap">Tipo/CC</th>
            <th className="text-left p-3 whitespace-nowrap">Marca</th>
            <th className="text-left p-3 whitespace-nowrap">Color</th>
            <th className="text-left p-3 w-20 whitespace-nowrap">Año</th>
            <th className="text-left p-3 whitespace-nowrap">Chasis</th>
            <th className="text-left p-3 whitespace-nowrap">Motor</th>
            <th className="text-left p-3 whitespace-nowrap">Ubicación</th>
            {isAdmin && <th className="text-left p-3 whitespace-nowrap">Proveedor</th>}
            {isAdmin && <th className="text-left p-3 whitespace-nowrap">Precio de Compra</th>}
            <th className="text-left p-3 whitespace-nowrap">Precio de Venta</th>
            <th className="p-3 w-24" />
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
              <td className="p-3 font-mono text-xs whitespace-nowrap overflow-hidden text-ellipsis">{m.numero_chasis ?? '—'}</td>
              <td className="p-3 font-mono text-xs whitespace-nowrap overflow-hidden text-ellipsis">{m.numero_motor ?? '—'}</td>
              <td className="p-3">{m.ubicacion ?? '—'}</td>
              {isAdmin && <td className="p-3">{m.proveedor ?? '—'}</td>}
              {isAdmin && (
                <td className="p-3 text-amber-700 font-medium">{formatBOB(costos?.[m.id] ?? 0)}</td>
              )}
              <td className="p-3">{formatBOB(m.precio_venta)}</td>
              <td className="p-3">
                <div className="flex items-center gap-1">
                  {(m.fotos?.length ?? 0) > 0 && (
                    <Button size="sm" variant="ghost" title="Ver fotos" onClick={() => setMotoFotos(m)}>
                      <Images size={14} className="text-blue-600" />
                    </Button>
                  )}
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
                  {isAdmin && (
                    <Button size="sm" variant="ghost" title="Eliminar moto" onClick={() => handleDelete(m)}>
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {motos.length === 0 && (
            <tr><td colSpan={isAdmin ? 12 : 10} className="p-6 text-center text-slate-400">Sin motos</td></tr>
          )}
        </tbody>
      </table>
      {motoFotos && (
        <FotosLightbox
          titulo={`${motoFotos.marca} ${motoFotos.modelo}`}
          fotos={motoFotos.fotos}
          onClose={() => setMotoFotos(null)}
        />
      )}
    </div>
  )
}
