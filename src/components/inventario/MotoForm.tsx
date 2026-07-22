'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Moto } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MotoFotos } from './MotoFotos'

interface Props { moto?: Moto; costoInicial?: number }

export interface MotoFormValues {
  marca: string
  modelo: string
  color: string
  anio: string
  numero_chasis: string
  numero_motor: string
  motor_cc: string
  ubicacion: string
  proveedor: string
  costo: string
  precio_venta: string
}

// Arma el payload para `motos` (sin costo: va a motos_costos aparte) y devuelve el
// costo por separado. `descripcion` se fija en null (se quitó del registro).
export function buildMotoPayload(form: MotoFormValues): { motoData: Record<string, unknown>; costo: number } {
  const motoData = {
    codigo: form.numero_chasis,
    marca: form.marca,
    modelo: form.modelo,
    anio: form.anio ? parseInt(form.anio) : null,
    color: form.color || null,
    motor_cc: form.motor_cc ? parseInt(form.motor_cc) : null,
    numero_motor: form.numero_motor || null,
    numero_chasis: form.numero_chasis,
    precio_venta: parseFloat(form.precio_venta),
    ubicacion: form.ubicacion || null,
    proveedor: form.proveedor || null,
    descripcion: null,
  }
  return { motoData, costo: parseFloat(form.costo) }
}

export function MotoForm({ moto, costoInicial }: Props) {
  const router = useRouter()
  const isEdit = Boolean(moto)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fotos, setFotos] = useState<string[]>(moto?.fotos ?? [])
  const [form, setForm] = useState<MotoFormValues>({
    marca: moto?.marca ?? '',
    modelo: moto?.modelo ?? '',
    color: moto?.color ?? '',
    anio: moto?.anio?.toString() ?? '',
    numero_chasis: moto?.numero_chasis ?? '',
    numero_motor: moto?.numero_motor ?? '',
    motor_cc: moto?.motor_cc?.toString() ?? '',
    ubicacion: moto?.ubicacion ?? '',
    proveedor: moto?.proveedor ?? '',
    costo: costoInicial?.toString() ?? '',
    precio_venta: moto?.precio_venta?.toString() ?? '',
  })

  function set(field: keyof MotoFormValues, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { motoData, costo } = buildMotoPayload(form)

    let motoId = moto?.id
    if (isEdit) {
      const { error: err } = await supabase.from('motos')
        .update({ ...motoData, updated_at: new Date().toISOString() }).eq('id', moto!.id)
      if (err) { setError(err.message); setLoading(false); return }
    } else {
      const { data, error: err } = await supabase.from('motos')
        .insert({ ...motoData, stock: 1, stock_minimo: 0 }).select('id').single()
      if (err || !data) { setError(err?.message ?? 'No se pudo crear la moto'); setLoading(false); return }
      motoId = data.id
    }

    const { error: costoErr } = await supabase.from('motos_costos')
      .upsert({ moto_id: motoId, costo, updated_at: new Date().toISOString() }, { onConflict: 'moto_id' })
    if (costoErr) { setError(costoErr.message); setLoading(false); return }

    router.push('/inventario/motos')
    router.refresh()
  }

  const fields: { label: string; field: keyof MotoFormValues; type: string; required?: boolean }[] = [
    { label: 'Tipo/CC', field: 'modelo', type: 'text', required: true },
    { label: 'Marca', field: 'marca', type: 'text', required: true },
    { label: 'Color', field: 'color', type: 'text' },
    { label: 'Año', field: 'anio', type: 'number' },
    { label: 'Nº Chasis', field: 'numero_chasis', type: 'text', required: true },
    { label: 'Nº Motor', field: 'numero_motor', type: 'text' },
    { label: 'Cilindrada (cc)', field: 'motor_cc', type: 'number' },
    { label: 'Ubicación', field: 'ubicacion', type: 'text' },
    { label: 'Proveedor', field: 'proveedor', type: 'text' },
    { label: 'Precio de Compra (Bs.)', field: 'costo', type: 'number', required: true },
    { label: 'Precio de Venta (Bs.)', field: 'precio_venta', type: 'number', required: true },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {fields.map(({ label, field, type, required }) => (
        <div key={field} className="space-y-1">
          <Label>{label}</Label>
          <Input type={type} value={form[field]}
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
