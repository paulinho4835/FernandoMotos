'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Cliente } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { Search, ChevronDown, ChevronUp, ShoppingBag, Bike, X } from 'lucide-react'

interface DetalleRepuesto {
  id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  productos: { codigo: string; nombre: string; marca: string | null; medida: string | null } | null
}

interface DetalleMoto {
  id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  marca: string | null
  modelo: string | null
  anio: number | null
  numero_chasis: string | null
  numero_motor: string | null
}

interface Venta {
  id: string
  tipo_venta: string
  total: number
  created_at: string
  perfiles: { nombre: string } | null
  detalle_ventas: DetalleRepuesto[]
  detalle_ventas_motos: DetalleMoto[]
}

interface Props { clientes: Cliente[] }

export function ClientesClient({ clientes }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Cliente | null>(null)
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedVenta, setExpandedVenta] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return clientes
    return clientes.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.nit ?? '').toLowerCase().includes(q) ||
      (c.telefono ?? '').toLowerCase().includes(q)
    )
  }, [clientes, search])

  async function handleSelectCliente(c: Cliente) {
    if (selected?.id === c.id) {
      setSelected(null)
      setVentas([])
      return
    }
    setSelected(c)
    setVentas([])
    setExpandedVenta(null)
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('ventas')
      .select(`
        id, tipo_venta, total, created_at,
        perfiles(nombre),
        detalle_ventas(id, cantidad, precio_unitario, subtotal, productos(codigo, nombre, marca, medida)),
        detalle_ventas_motos(id, cantidad, precio_unitario, subtotal, marca, modelo, anio, numero_chasis, numero_motor)
      `)
      .eq('cliente_id', c.id)
      .order('created_at', { ascending: false })
    setVentas((data as unknown as Venta[]) ?? [])
    setLoading(false)
  }

  function formatFecha(dateStr: string) {
    const d = new Date(new Date(dateStr).getTime() - 4 * 60 * 60 * 1000)
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por nombre, NIT o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Tabla de clientes */}
        <div className="w-full lg:flex-1 rounded-md border overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">NIT / CI</th>
                <th className="text-left p-3">Teléfono</th>
                <th className="text-left p-3">Registrado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  onClick={() => handleSelectCliente(c)}
                  className={`border-t cursor-pointer transition-colors ${
                    selected?.id === c.id
                      ? 'bg-slate-900 text-white'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="p-3 font-medium">{c.nombre}</td>
                  <td className={`p-3 ${selected?.id === c.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    {c.nit ?? '—'}
                  </td>
                  <td className={`p-3 ${selected?.id === c.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    {c.telefono ?? '—'}
                  </td>
                  <td className={`p-3 text-xs ${selected?.id === c.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    {new Date(c.created_at).toLocaleDateString('es-BO')}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-slate-400">Sin clientes</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Panel historial */}
        {selected && (
          <div className="w-full lg:w-96 lg:shrink-0 border rounded-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-semibold">{selected.nombre}</p>
                {selected.nit && <p className="text-xs text-slate-300">NIT / CI: {selected.nit}</p>}
              </div>
              <button onClick={() => { setSelected(null); setVentas([]) }} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {loading && (
                <div className="p-6 text-center text-slate-400 text-sm">Cargando historial...</div>
              )}

              {!loading && ventas.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-sm">Sin compras registradas</div>
              )}

              {!loading && ventas.length > 0 && (
                <div className="divide-y">
                  {ventas.map(v => (
                    <div key={v.id} className="p-3">
                      <button
                        onClick={() => setExpandedVenta(expandedVenta === v.id ? null : v.id)}
                        className="w-full flex items-center justify-between text-left gap-2"
                      >
                        <div className="flex items-center gap-2">
                          {v.tipo_venta === 'moto'
                            ? <Bike size={14} className="text-blue-500 shrink-0" />
                            : <ShoppingBag size={14} className="text-green-500 shrink-0" />
                          }
                          <div>
                            <p className="text-xs font-medium text-slate-700">
                              {v.tipo_venta === 'moto' ? 'Moto' : 'Repuestos'} · {formatBOB(v.total)}
                            </p>
                            <p className="text-xs text-slate-400">{formatFecha(v.created_at)}</p>
                            {v.perfiles?.nombre && (
                              <p className="text-xs text-slate-400">Vendedor: {v.perfiles.nombre}</p>
                            )}
                          </div>
                        </div>
                        {expandedVenta === v.id
                          ? <ChevronUp size={14} className="text-slate-400 shrink-0" />
                          : <ChevronDown size={14} className="text-slate-400 shrink-0" />
                        }
                      </button>

                      {expandedVenta === v.id && (
                        <div className="mt-2 ml-5 space-y-1">
                          {v.tipo_venta === 'repuesto' && v.detalle_ventas.map(d => (
                            <div key={d.id} className="flex justify-between text-xs text-slate-600 gap-2">
                              <div>
                                <div>
                                  {d.productos?.nombre || d.productos?.codigo || '—'}
                                  {d.cantidad > 1 && <span className="text-slate-400"> ×{d.cantidad}</span>}
                                </div>
                                <div className="text-slate-400">
                                  {[
                                    d.productos?.codigo && `Cód: ${d.productos.codigo}`,
                                    d.productos?.marca,
                                    d.productos?.medida,
                                  ].filter(Boolean).join(' · ')}
                                </div>
                                <div className="text-slate-400">P. unitario: {formatBOB(d.precio_unitario)}</div>
                              </div>
                              <span className="font-medium shrink-0 ml-2">{formatBOB(d.subtotal)}</span>
                            </div>
                          ))}
                          {v.tipo_venta === 'moto' && v.detalle_ventas_motos.map(d => (
                            <div key={d.id} className="flex justify-between text-xs text-slate-600">
                              <div>
                                <div>{d.marca ? `${d.marca} ${d.modelo}${d.anio ? ` ${d.anio}` : ''}` : '—'}</div>
                                {(d.numero_chasis || d.numero_motor) && (
                                  <div className="text-slate-400">
                                    {[d.numero_chasis && `Chasis: ${d.numero_chasis}`, d.numero_motor && `Motor: ${d.numero_motor}`]
                                      .filter(Boolean).join(' · ')}
                                  </div>
                                )}
                              </div>
                              <span className="font-medium shrink-0 ml-2">{formatBOB(d.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!loading && ventas.length > 0 && (
              <div className="border-t px-4 py-2 bg-slate-50 flex justify-between text-sm">
                <span className="text-slate-500">{ventas.length} compra{ventas.length !== 1 ? 's' : ''}</span>
                <span className="font-semibold">{formatBOB(ventas.reduce((s, v) => s + v.total, 0))}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
