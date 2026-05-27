'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/store/cartStore'
import { useMotoCartStore } from '@/lib/store/motoCartStore'
import type { TipoVenta } from '@/lib/types'
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
}

export function CheckoutModal({ open, onClose, mode, vendedorId, vendedorNombre }: Props) {
  const repuestoItems = useCartStore(s => s.items)
  const repuestoTotal = useCartStore(s => s.total)
  const repuestoGanancia = useCartStore(s => s.ganancia)
  const clearRepuesto = useCartStore(s => s.clear)

  const motoItems = useMotoCartStore(s => s.items)
  const motoTotal = useMotoCartStore(s => s.total)
  const motoGanancia = useMotoCartStore(s => s.ganancia)
  const clearMoto = useMotoCartStore(s => s.clear)

  const [clienteNombre, setClienteNombre] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  const total = mode === 'repuesto' ? repuestoTotal() : motoTotal()
  const ganancia = mode === 'repuesto' ? repuestoGanancia() : motoGanancia()

  async function handleConfirm() {
    setLoading(true)
    const supabase = createClient()

    let clienteId: string | null = null
    if (clienteNombre.trim()) {
      const { data: c } = await supabase
        .from('clientes').insert({ nombre: clienteNombre.trim() }).select('id').single()
      clienteId = c?.id ?? null
    }

    const payload =
      mode === 'repuesto'
        ? {
            vendedor_id: vendedorId,
            cliente_id: clienteId,
            total,
            ganancia_neta: ganancia,
            notas: notas || null,
            items: repuestoItems.map(i => ({
              producto_id: i.producto_id,
              cantidad: i.cantidad,
              precio_unitario: i.precio_unitario,
              costo_unitario: i.costo_unitario,
            })),
          }
        : {
            vendedor_id: vendedorId,
            cliente_id: clienteId,
            total,
            ganancia_neta: ganancia,
            notas: notas || null,
            items: motoItems.map(i => ({
              moto_id: i.moto_id,
              cantidad: i.cantidad,
              precio_unitario: i.precio_unitario,
              costo_unitario: i.costo_unitario,
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
      clienteNombre: clienteNombre || undefined,
      vendedorNombre,
      fecha: new Date().toLocaleDateString('es-BO'),
    })

    if (mode === 'repuesto') { clearRepuesto() } else { clearMoto() }
    toast.success('Venta registrada correctamente')
    setClienteNombre('')
    setNotas('')
    setLoading(false)
    onClose()
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
            <Label>Cliente (opcional)</Label>
            <Input placeholder="Nombre del cliente" value={clienteNombre}
              onChange={e => setClienteNombre(e.target.value)} />
          </div>
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
