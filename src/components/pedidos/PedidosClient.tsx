'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { toast, Toaster } from 'sonner'
import { Check, X, Phone } from 'lucide-react'
import type { Vendedor } from '@/lib/types'
import { borrarFotosR2 } from '@/lib/utils/borrarFotosR2'

interface Pedido {
  id: string
  cantidad: number
  cliente_nombre: string
  cliente_telefono: string
  precio_ofertado: number | null
  notas: string | null
  created_at: string
  motos: { id: string; marca: string; modelo: string; anio: number | null; precio_venta: number } | null
}

interface Props { pedidos: Pedido[]; vendedores: Vendedor[]; vendedorNombre: string }

export function PedidosClient({ pedidos: inicial, vendedores, vendedorNombre }: Props) {
  const router = useRouter()
  const [lista, setLista] = useState<Pedido[]>(inicial)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [vendedorSel, setVendedorSel] = useState('')

  async function confirmar(p: Pedido) {
    if (!p.motos) return
    if (!vendedorSel) { toast.error('Selecciona el vendedor antes de confirmar'); return }
    const precio = p.precio_ofertado ?? p.motos.precio_venta
    if (!confirm(`¿Confirmar venta de ${p.motos.marca} ${p.motos.modelo} a ${p.cliente_nombre} por ${formatBOB(precio)}?`)) return
    setBusyId(p.id)
    const supabase = createClient()

    // 1) Crear/obtener cliente por teléfono.
    let clienteId: string | null = null
    const { data: existente } = await supabase.from('clientes').select('id').eq('telefono', p.cliente_telefono).maybeSingle()
    if (existente) clienteId = existente.id
    else {
      const { data: nuevo } = await supabase.from('clientes').insert({ nombre: p.cliente_nombre, telefono: p.cliente_telefono }).select('id').single()
      clienteId = nuevo?.id ?? null
    }

    // 2) Crear la venta real (descuenta stock) reusando el RPC existente.
    const nombreVendedor = vendedores.find(v => v.id === vendedorSel)?.nombre ?? vendedorNombre
    const { data, error } = await supabase.rpc('crear_venta_moto', {
      payload: {
        cliente_id: clienteId,
        vendedor_nombre: nombreVendedor,
        notas: p.notas,
        items: [{ moto_id: p.motos.id, cantidad: p.cantidad, precio_unitario: precio }],
      },
    })
    if (error) { toast.error(`Error al crear la venta: ${error.message}`); setBusyId(null); return }
    const result = data as { venta_id: string; fotos_a_borrar: string[] }
    const ventaId = result.venta_id
    borrarFotosR2(result.fotos_a_borrar)

    // 3) Marcar el pedido como confirmado.
    await supabase.from('pedidos').update({ estado: 'confirmado', cliente_id: clienteId, venta_id: ventaId, updated_at: new Date().toISOString() }).eq('id', p.id)

    setLista(l => l.filter(x => x.id !== p.id))
    toast.success('Venta registrada y stock descontado')
    setBusyId(null)
    router.refresh()
  }

  async function cancelar(p: Pedido) {
    if (!confirm(`¿Cancelar el pedido de ${p.cliente_nombre}?`)) return
    setBusyId(p.id)
    const supabase = createClient()
    await supabase.from('pedidos').update({ estado: 'cancelado', updated_at: new Date().toISOString() }).eq('id', p.id)
    setLista(l => l.filter(x => x.id !== p.id))
    toast.success('Pedido cancelado')
    setBusyId(null)
  }

  return (
    <div className="space-y-4">
      <Toaster />
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-slate-600">Vendedor que cierra:</label>
        <select value={vendedorSel} onChange={e => setVendedorSel(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-white">
          <option value="">— Selecciona —</option>
          {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      </div>

      {lista.length === 0 && <p className="text-slate-400">No hay pedidos pendientes.</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map(p => (
          <div key={p.id} className="border rounded-lg p-4 space-y-2 bg-white">
            <div>
              <p className="font-semibold">{p.motos ? `${p.motos.marca} ${p.motos.modelo}${p.motos.anio ? ` ${p.motos.anio}` : ''}` : '—'}</p>
              <p className="text-lg font-bold">{formatBOB(p.precio_ofertado ?? p.motos?.precio_venta ?? 0)}</p>
            </div>
            <div className="text-sm text-slate-600">
              <p className="font-medium">{p.cliente_nombre}</p>
              <a href={`https://wa.me/${p.cliente_telefono}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-green-600">
                <Phone size={13} /> {p.cliente_telefono}
              </a>
              {p.notas && <p className="text-xs text-slate-400 mt-1">{p.notas}</p>}
              <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleString('es-BO')}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" disabled={busyId === p.id} onClick={() => confirmar(p)}>
                <Check size={14} className="mr-1" /> Confirmar
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500" disabled={busyId === p.id} onClick={() => cancelar(p)}>
                <X size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
