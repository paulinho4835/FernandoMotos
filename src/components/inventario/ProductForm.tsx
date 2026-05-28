'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Producto, Categoria } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props { producto?: Producto; categorias?: Categoria[] }

export function ProductForm({ producto, categorias = [] }: Props) {
  const router = useRouter()
  const isEdit = Boolean(producto)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    codigo:             producto?.codigo ?? '',
    nombre:             producto?.nombre ?? '',
    descripcion:        producto?.descripcion ?? '',
    costo:              producto?.costo?.toString() ?? '',
    precio_venta:       producto?.precio_venta?.toString() ?? '',
    precio_referencial: producto?.precio_referencial?.toString() ?? '',
    stock:              producto?.stock?.toString() ?? '0',
    stock_minimo:       producto?.stock_minimo?.toString() ?? '5',
    ubicacion:          producto?.ubicacion ?? '',
    compatibilidad:     producto?.compatibilidad?.join(', ') ?? '',
    medida_interna:     producto?.medida_interna ?? '',
    medida_externa:     producto?.medida_externa ?? '',
    altura:             producto?.altura ?? '',
    categoria_id:       producto?.categoria_id ?? '',
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
      codigo:             form.codigo,
      nombre:             form.nombre,
      descripcion:        form.descripcion || null,
      costo:              parseFloat(form.costo),
      precio_venta:       form.precio_venta ? parseFloat(form.precio_venta) : 0,
      precio_referencial: form.precio_referencial ? parseFloat(form.precio_referencial) : null,
      stock:              parseInt(form.stock),
      stock_minimo:       parseInt(form.stock_minimo),
      ubicacion:          form.ubicacion || null,
      compatibilidad:     form.compatibilidad.split(',').map(s => s.trim()).filter(Boolean),
      medida_interna:     form.medida_interna || null,
      medida_externa:     form.medida_externa || null,
      altura:             form.altura || null,
      categoria_id:       form.categoria_id || null,
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">

      {/* Categoría */}
      {categorias.length > 0 && (
        <div className="space-y-1">
          <Label>Categoría <span className="text-xs text-slate-400">(opcional)</span></Label>
          <select
            value={form.categoria_id}
            onChange={e => set('categoria_id', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">— Sin categoría —</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {/* Identificación */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Identificación</h2>
        {[
          { label: 'Código (SKU)', field: 'codigo', required: true },
          { label: 'Nombre',       field: 'nombre' },
          { label: 'Descripción',  field: 'descripcion' },
        ].map(({ label, field, required }) => (
          <div key={field} className="space-y-1">
            <Label>{label}{required && <span className="text-red-500 ml-1">*</span>}</Label>
            <Input value={form[field as keyof typeof form]} onChange={e => set(field, e.target.value)} required={required} />
          </div>
        ))}
      </div>

      {/* Medidas (opcionales) */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Medidas <span className="text-xs font-normal normal-case">(opcional)</span></h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Medida Interna', field: 'medida_interna' },
            { label: 'Medida Externa', field: 'medida_externa' },
            { label: 'Altura',         field: 'altura' },
          ].map(({ label, field }) => (
            <div key={field} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input value={form[field as keyof typeof form]} onChange={e => set(field, e.target.value)} placeholder="ej: 25mm" />
            </div>
          ))}
        </div>
      </div>

      {/* Precios — solo admin ve este formulario */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Precios</h2>
        <div className="space-y-1">
          <Label>Costo de adquisición (Bs.) <span className="text-red-500">*</span></Label>
          <Input type="number" step="0.01" value={form.costo} onChange={e => set('costo', e.target.value)} required />
          <p className="text-xs text-slate-400">Solo visible para administradores.</p>
        </div>
        <div className="space-y-1">
          <Label>Precio referencial (Bs.) <span className="text-xs text-slate-400">(opcional)</span></Label>
          <Input type="number" step="0.01" value={form.precio_referencial} onChange={e => set('precio_referencial', e.target.value)} placeholder="Precio aproximado de venta" />
          <p className="text-xs text-slate-400">Guía para vendedores. No es el precio definitivo.</p>
        </div>
        <div className="space-y-1">
          <Label>Precio de venta (Bs.) <span className="text-xs text-slate-400">(opcional)</span></Label>
          <Input type="number" step="0.01" value={form.precio_venta} onChange={e => set('precio_venta', e.target.value)} />
          <p className="text-xs text-slate-400">Podés definirlo al momento de realizar la venta.</p>
        </div>
      </div>

      {/* Inventario */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Inventario</h2>
        {[
          { label: 'Stock actual', field: 'stock', required: true },
        ].map(({ label, field, required }) => (
          <div key={field} className="space-y-1">
            <Label>{label}{required && <span className="text-red-500 ml-1">*</span>}</Label>
            <Input type="number" value={form[field as keyof typeof form]} onChange={e => set(field, e.target.value)} required={required} />
          </div>
        ))}
        <div className="space-y-1">
          <Label>Stock mínimo <span className="text-xs text-slate-400">(opcional)</span></Label>
          <Input type="number" min="0" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} />
          <p className="text-xs text-slate-400">Cuando el stock baje de este número, aparece una alerta "Crítico" en el inventario. Dejá en 0 para no usar alertas.</p>
        </div>
        <div className="space-y-1">
          <Label>Ubicación <span className="text-xs text-slate-400">(ej: Estante A-3)</span></Label>
          <Input value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Compatibilidad <span className="text-xs text-slate-400">(separar con comas)</span></Label>
          <Input value={form.compatibilidad} onChange={e => set('compatibilidad', e.target.value)} placeholder="Honda CG, Yamaha YBR" />
        </div>
      </div>

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
