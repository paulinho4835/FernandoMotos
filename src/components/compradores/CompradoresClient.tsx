'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { toast, Toaster } from 'sonner'
import { Phone } from 'lucide-react'

export interface Comprador {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  precio_ofertado: number | null
  adelanto: number
  estado: string
  origen: string
  notas: string | null
  created_at: string
  motos: { marca: string; modelo: string; precio_venta: number } | null
}

const ESTADOS = ['todos', 'pendiente', 'confirmado', 'cancelado'] as const

export function CompradoresClient({ pedidos }: { pedidos: Comprador[] }) {
  const [lista, setLista] = useState<Comprador[]>(pedidos)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editValor, setEditValor] = useState('')

  const precio = (p: Comprador) => p.precio_ofertado ?? p.motos?.precio_venta ?? 0

  const visibles = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    return lista.filter(p => {
      if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false
      if (t && !p.cliente_nombre.toLowerCase().includes(t) && !p.cliente_telefono.includes(t)) return false
      return true
    })
  }, [lista, filtroEstado, busqueda])

  async function guardar(p: Comprador) {
    const monto = Number(editValor)
    if (!Number.isFinite(monto) || monto < 0) { toast.error('Monto inválido'); return }
    if (monto > precio(p)) { toast.error(`El adelanto no puede superar el precio (${formatBOB(precio(p))})`); return }
    const supabase = createClient()
    const { error } = await supabase
      .from('pedidos')
      .update({ adelanto: monto, updated_at: new Date().toISOString() })
      .eq('id', p.id)
    if (error) { toast.error(error.message); return }
    setLista(l => l.map(x => x.id === p.id ? { ...x, adelanto: monto } : x))
    setEditId(null)
    toast.success('Adelanto actualizado')
  }

  return (
    <div className="space-y-4">
      <Toaster />
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600 flex items-center gap-1">
          Estado:
          <select aria-label="Filtrar por estado" value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm bg-white">
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <input aria-label="Buscar" placeholder="Buscar por nombre o teléfono"
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="border rounded-md px-3 py-1 text-sm flex-1 min-w-[12rem]" />
      </div>

      {visibles.length === 0 && <p className="text-slate-400">No hay compradores para ese filtro.</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b">
            <tr>
              <th className="py-2 pr-3">Cliente</th>
              <th className="py-2 pr-3">Moto</th>
              <th className="py-2 pr-3">Precio</th>
              <th className="py-2 pr-3">Adelanto</th>
              <th className="py-2 pr-3">Saldo</th>
              <th className="py-2 pr-3">Estado</th>
              <th className="py-2 pr-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map(p => {
              const saldo = precio(p) - p.adelanto
              return (
                <tr key={p.id} className="border-b align-top">
                  <td className="py-2 pr-3">
                    <p className="font-medium">{p.cliente_nombre}</p>
                    <a href={`https://wa.me/${p.cliente_telefono}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-green-600 text-xs">
                      <Phone size={12} /> {p.cliente_telefono}
                    </a>
                    {p.notas && <p className="text-xs text-slate-400">{p.notas}</p>}
                  </td>
                  <td className="py-2 pr-3">{p.motos ? `${p.motos.marca} ${p.motos.modelo}` : '—'}</td>
                  <td className="py-2 pr-3">{formatBOB(precio(p))}</td>
                  <td className="py-2 pr-3">
                    {editId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input aria-label="Nuevo adelanto" type="number" value={editValor}
                          onChange={e => setEditValor(e.target.value)}
                          className="border rounded px-1 py-0.5 w-24 text-sm" />
                        <Button size="sm" onClick={() => guardar(p)}>Guardar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>×</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{formatBOB(p.adelanto)}</span>
                        <button aria-label="Editar adelanto" className="text-xs text-blue-600"
                          onClick={() => { setEditId(p.id); setEditValor(String(p.adelanto)) }}>
                          editar
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-medium">{formatBOB(saldo)}</td>
                  <td className="py-2 pr-3 capitalize">{p.estado}</td>
                  <td className="py-2 pr-3 text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString('es-BO')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
