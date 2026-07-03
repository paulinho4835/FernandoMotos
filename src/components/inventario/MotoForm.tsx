'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Moto } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MotoFotos } from './MotoFotos'

interface Props { moto?: Moto }

export function MotoForm({ moto }: Props) {
  const router = useRouter()
  const isEdit = Boolean(moto)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fotos, setFotos] = useState<string[]>(moto?.fotos ?? [])
  const [form, setForm] = useState({
    marca: moto?.marca ?? '',
    modelo: moto?.modelo ?? '',
    color: moto?.color ?? '',
    anio: moto?.anio?.toString() ?? '',
    numero_chasis: moto?.numero_chasis ?? '',
    numero_motor: moto?.numero_motor ?? '',
    motor_cc: moto?.motor_cc?.toString() ?? '',
    costo: moto?.costo?.toString() ?? '',
    precio_venta: moto?.precio_venta?.toString() ?? '',
    stock: moto?.stock?.toString() ?? '0',
    stock_minimo: moto?.stock_minimo?.toString() ?? '1',
    descripcion: moto?.descripcion ?? '',
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
      codigo: form.numero_chasis,
      marca: form.marca,
      modelo: form.modelo,
      anio: form.anio ? parseInt(form.anio) : null,
      color: form.color || null,
      motor_cc: form.motor_cc ? parseInt(form.motor_cc) : null,
      numero_motor: form.numero_motor || null,
      numero_chasis: form.numero_chasis,
      costo: parseFloat(form.costo),
      precio_venta: parseFloat(form.precio_venta),
      stock: parseInt(form.stock),
      stock_minimo: parseInt(form.stock_minimo),
      descripcion: form.descripcion || null,
    }
    let err
    if (isEdit) {
      ({ error: err } = await supabase.from('motos').update({ ...data, updated_at: new Date().toISOString() }).eq('id', moto!.id))
    } else {
      ({ error: err } = await supabase.from('motos').insert(data))
    }
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/inventario/motos')
    router.refresh()
  }

  const fields = [
    { label: 'Modelo', field: 'modelo', type: 'text', required: true },
    { label: 'Marca', field: 'marca', type: 'text', required: true },
    { label: 'Color', field: 'color', type: 'text' },
    { label: 'Año', field: 'anio', type: 'number' },
    { label: 'Nº Chasis', field: 'numero_chasis', type: 'text', required: true },
    { label: 'Nº Motor', field: 'numero_motor', type: 'text' },
    { label: 'Cilindrada (cc)', field: 'motor_cc', type: 'number' },
    { label: 'Costo (Bs.)', field: 'costo', type: 'number', required: true },
    { label: 'Precio Referencial (Bs.)', field: 'precio_venta', type: 'number', required: true },
    { label: 'Stock actual', field: 'stock', type: 'number', required: true },
    { label: 'Stock mínimo', field: 'stock_minimo', type: 'number', required: true },
    { label: 'Descripción', field: 'descripcion', type: 'text' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {fields.map(({ label, field, type, required }) => (
        <div key={field} className="space-y-1">
          <Label>{label}</Label>
          <Input type={type} value={form[field as keyof typeof form]}
            onChange={e => set(field, e.target.value)} required={required}
            step={type === 'number' ? '1' : undefined} />
        </div>
      ))}
      {isEdit ? (
        <MotoFotos motoId={moto!.id} fotos={fotos} onChange={setFotos} />
      ) : (
        <p className="text-xs text-slate-500">Guarda la moto para poder agregar fotos.</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Registrar Moto'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
