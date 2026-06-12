'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/store/cartStore'
import { useMotoCartStore } from '@/lib/store/motoCartStore'
import type { TipoVenta, Vendedor } from '@/lib/types'
import { formatBOB } from '@/lib/utils/formatCurrency'
import { generateAndOpenPDF } from './ReceiptPDF'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  mode: TipoVenta
  vendedorId: string
  vendedorNombre: string
  isAdmin: boolean
}

interface ClienteSugerido {
  id: string
  nombre: string
  telefono: string | null
}

export function CheckoutModal({ open, onClose, mode, vendedorId: _vendedorId, vendedorNombre, isAdmin }: Props) {
  const router = useRouter()
  const repuestoItems = useCartStore(s => s.items)
  const repuestoTotal = useCartStore(s => s.total)
  const repuestoGanancia = useCartStore(s => s.ganancia)
  const clearRepuesto = useCartStore(s => s.clear)

  const motoItems = useMotoCartStore(s => s.items)
  const motoTotal = useMotoCartStore(s => s.total)
  const motoGanancia = useMotoCartStore(s => s.ganancia)
  const clearMoto = useMotoCartStore(s => s.clear)

  const [clienteQuery, setClienteQuery] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteSugerido | null>(null)
  const [sugerencias, setSugerencias] = useState<ClienteSugerido[]>([])
  const [showSugerencias, setShowSugerencias] = useState(false)
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState('')
  const [telefono, setTelefono] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const total = mode === 'repuesto' ? repuestoTotal() : motoTotal()
  const _ganancia = mode === 'repuesto' ? repuestoGanancia() : motoGanancia()

  useEffect(() => {
    if (open) {
      const supabase = createClient()
      supabase.from('vendedores').select('*')
        .eq('activo', true)
        .eq('tipo', isAdmin ? 'admin' : 'vendedor')
        .order('nombre')
        .then(({ data }) => setVendedores(data ?? []))
    } else {
      setClienteQuery('')
      setClienteSeleccionado(null)
      setSugerencias([])
      setVendedorSeleccionado('')
      setTelefono('')
      setNotas('')
    }
  }, [open, isAdmin])

  useEffect(() => {
    const q = clienteQuery.trim()
    if (!q || clienteSeleccionado) {
      setSugerencias([])
      return
    }
    const timer = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('clientes')
        .select('id, nombre, telefono')
        .ilike('nombre', `%${q}%`)
        .limit(6)
      setSugerencias(data ?? [])
      setShowSugerencias(true)
    }, 200)
    return () => clearTimeout(timer)
  }, [clienteQuery, clienteSeleccionado])

  function seleccionarCliente(c: ClienteSugerido) {
    setClienteSeleccionado(c)
    setClienteQuery(c.nombre)
    if (c.telefono) setTelefono(c.telefono)
    setSugerencias([])
    setShowSugerencias(false)
  }

  function limpiarCliente() {
    setClienteSeleccionado(null)
    setClienteQuery('')
    setTelefono('')
    setSugerencias([])
  }

  async function handleConfirm() {
    if (!vendedorSeleccionado) {
      toast.error('Selecciona el vendedor')
      return
    }
    if (mode === 'moto') {
      if (!clienteQuery.trim()) {
        toast.error('Ingresa el nombre del cliente para venta de moto')
        return
      }
      if (!telefono.trim()) {
        toast.error('El teléfono del cliente es obligatorio para venta de moto')
        return
      }
    }

    setLoading(true)
    const supabase = createClient()

    let clienteId: string | null = null
    let clienteNombreFinal: string | undefined

    if (clienteSeleccionado) {
      clienteId = clienteSeleccionado.id
      clienteNombreFinal = clienteSeleccionado.nombre
      if (mode === 'moto' && telefono.trim() && telefono.trim() !== (clienteSeleccionado.telefono ?? '')) {
        await supabase.from('clientes').update({ telefono: telefono.trim() }).eq('id', clienteId)
      }
    } else if (clienteQuery.trim()) {
      const { data: c } = await supabase
        .from('clientes')
        .insert({ nombre: clienteQuery.trim(), telefono: telefono.trim() || null })
        .select('id').single()
      clienteId = c?.id ?? null
      clienteNombreFinal = clienteQuery.trim()
    }

    const nombreVendedor = vendedores.find(v => v.id === vendedorSeleccionado)?.nombre ?? vendedorNombre

    const payload =
      mode === 'repuesto'
        ? {
            cliente_id: clienteId,
            notas: notas || null,
            items: repuestoItems.map(i => ({
              producto_id: i.producto_id,
              cantidad: i.cantidad,
            })),
          }
        : {
            cliente_id: clienteId,
            notas: notas || null,
            items: motoItems.map(i => ({
              moto_id: i.moto_id,
              cantidad: i.cantidad,
            })),
          }

    const rpc = mode === 'repuesto' ? 'crear_venta_repuesto' : 'crear_venta_moto'
    const { data: ventaId, error } = await supabase.rpc(rpc, { payload })

    if (error) {
      toast.error(`Error: ${error.message}`)
      setLoading(false)
      return
    }

    await generateAndOpenPDF({
      ventaId,
      tipo: mode,
      repuestoItems: mode === 'repuesto' ? repuestoItems : undefined,
      motoItems: mode === 'moto' ? motoItems : undefined,
      total,
      clienteNombre: clienteNombreFinal,
      vendedorNombre: nombreVendedor,
      fecha: new Date().toLocaleDateString('es-BO'),
    })

    if (mode === 'repuesto') { clearRepuesto() } else { clearMoto() }
    toast.success('Venta registrada correctamente')
    setLoading(false)
    onClose()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Venta — {mode === 'repuesto' ? 'Repuestos' : 'Moto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-slate-50 rounded p-4 flex justify-between items-center">
            <span className="text-slate-600">Total a cobrar</span>
            <span className="text-2xl font-bold">{formatBOB(total)}</span>
          </div>

          <div className="space-y-1">
            <Label>Vendedor <span className="text-red-500">*</span></Label>
            <select
              value={vendedorSeleccionado}
              onChange={e => setVendedorSeleccionado(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            >
              <option value="">— Selecciona un vendedor —</option>
              {vendedores.map(v => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
            {vendedores.length === 0 && (
              <p className="text-xs text-amber-600">No hay vendedores registrados. El administrador debe agregar vendedores primero.</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>{mode === 'moto' ? 'Cliente (obligatorio)' : 'Cliente (opcional)'}</Label>
            <div className="relative" ref={dropdownRef}>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar o escribir nombre del cliente"
                  value={clienteQuery}
                  onChange={e => {
                    setClienteQuery(e.target.value)
                    if (clienteSeleccionado) setClienteSeleccionado(null)
                  }}
                  onFocus={() => sugerencias.length > 0 && setShowSugerencias(true)}
                  className={clienteSeleccionado ? 'border-green-500' : ''}
                />
                {clienteQuery && (
                  <Button variant="ghost" size="sm" onClick={limpiarCliente} className="px-2">✕</Button>
                )}
              </div>

              {clienteSeleccionado && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Cliente existente — el historial de compras quedará vinculado
                </p>
              )}

              {!clienteSeleccionado && clienteQuery.trim() && sugerencias.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  Se creará un cliente nuevo con este nombre
                </p>
              )}

              {showSugerencias && sugerencias.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-auto">
                  {sugerencias.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                      onMouseDown={() => seleccionarCliente(c)}
                    >
                      <span className="font-medium">{c.nombre}</span>
                      {c.telefono && (
                        <span className="text-slate-400 ml-2">{c.telefono}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {mode === 'moto' && (
            <div className="space-y-1">
              <Label>Teléfono del cliente (obligatorio)</Label>
              <Input
                type="tel"
                placeholder="Ej: 70012345"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                className={telefono.trim() ? '' : 'border-red-300'}
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>Notas (opcional)</Label>
            <Input placeholder="Observaciones" value={notas}
              onChange={e => setNotas(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Procesando...' : 'Confirmar y generar recibo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
