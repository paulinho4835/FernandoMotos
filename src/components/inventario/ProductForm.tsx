'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Producto } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props { producto?: Producto }

export function ProductForm({ producto }: Props) {
  const router = useRouter()
  const isEdit = Boolean(producto)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    codigo: producto?.codigo ?? '',
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    costo: producto?.costo?.toString() ?? '',
    precio_venta: producto?.precio_venta?.toString() ?? '',
    stock: producto?.stock?.toString() ?? '0',
    stock_minimo: producto?.stock_minimo?.toString() ?? '5',
    ubicacion: producto?.ubicacion ?? '',
    compatibilidad: producto?.compatibilidad?.join(', ') ?? '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const data = {
      codigo: form.codigo,
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      costo: parseFloat(form.costo),
      precio_venta: parseFloat(form.precio_venta),
      stock: parseInt(form.stock),
      stock_minimo: parseInt(form.stock_minimo),
      ubicacion: form.ubicacion || null,
      compatibilidad: form.compatibilidad.split(',').map(s => s.trim()).filter(Boolean),
    }
    let err
    if (isEdit) {
      ({ error: err } = await supabase.from('productos').update({ ...data, updated_at: new Date().toISOString() }).eq('id', producto!.id))
    } else {
      ({ error: err } = await supabase.from('productos').insert(data))
    }
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/inventario')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {[
        { label: 'Código (SKU)', field: 'codigo', type: 'text', required: true },
        { label: 'Nombre', field: 'nombre', type: 'text', required: true },
        { label: 'Descripción', field: 'descripcion', type: 'text' },
        { label: 'Costo (Bs.)', field: 'costo', type: 'number', required: true },
        { label: 'Precio de Venta (Bs.)', field: 'precio_venta', type: 'number', required: true },
        { label: 'Stock actual', field: 'stock', type: 'number', required: true },
        { label: 'Stock mínimo', field: 'stock_minimo', type: 'number', required: true },
        { label: 'Ubicación (ej: Estante A-3)', field: 'ubicacion', type: 'text' },
        { label: 'Compatibilidad (separar con comas)', field: 'compatibilidad', type: 'text' },
      ].map(({ label, field, type, required }) => (
        <div key={field} className="space-y-1">
          <Label>{label}</Label>
          <Input type={type} value={form[field as keyof typeof form]}
            onChange={e => set(field, e.target.value)} required={required}
            step={type === 'number' ? '0.01' : undefined} />
        </div>
      ))}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Producto'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
