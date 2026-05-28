'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Categoria } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Edit, Plus, X, Check } from 'lucide-react'

interface Props { categorias: Categoria[] }

export function CategoriasClient({ categorias: initial }: Props) {
  const [categorias, setCategorias] = useState(initial)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function create() {
    if (!nombre.trim()) return
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('categorias')
      .insert({ nombre: nombre.trim(), descripcion: descripcion.trim() || null })
      .select()
      .single()
    if (err) { setError(err.message); setLoading(false); return }
    setCategorias(c => [...c, data].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)))
    setCreating(false); setNombre(''); setDescripcion(''); setLoading(false)
  }

  async function update(id: string) {
    if (!nombre.trim()) return
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('categorias')
      .update({ nombre: nombre.trim(), descripcion: descripcion.trim() || null })
      .eq('id', id)
      .select()
      .single()
    if (err) { setError(err.message); setLoading(false); return }
    setCategorias(c => c.map(cat => cat.id === id ? data : cat))
    setEditingId(null); setLoading(false)
  }

  async function remove(id: string, catNombre: string) {
    if (!confirm(`¿Eliminar "${catNombre}"? Los productos quedarán sin categoría.`)) return
    const supabase = createClient()
    const { error: err } = await supabase.from('categorias').delete().eq('id', id)
    if (err) { alert(err.message); return }
    setCategorias(c => c.filter(cat => cat.id !== id))
  }

  function startEdit(cat: Categoria) {
    setEditingId(cat.id); setNombre(cat.nombre); setDescripcion(cat.descripcion ?? '')
    setCreating(false); setError('')
  }

  function cancelEdit() {
    setEditingId(null); setCreating(false); setNombre(''); setDescripcion(''); setError('')
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Descripción</th>
              <th className="p-3 w-24" />
            </tr>
          </thead>
          <tbody>
            {categorias.map(cat => (
              <tr key={cat.id} className="border-t hover:bg-slate-50">
                {editingId === cat.id ? (
                  <>
                    <td className="p-2">
                      <Input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
                    </td>
                    <td className="p-2">
                      <Input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Opcional" />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => update(cat.id)} disabled={loading || !nombre.trim()}>
                          <Check size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X size={14} />
                        </Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-medium">{cat.nombre}</td>
                    <td className="p-3 text-slate-500">{cat.descripcion ?? '—'}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(cat)}>
                          <Edit size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
                          onClick={() => remove(cat.id, cat.nombre)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {categorias.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-slate-400">Sin categorías</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {creating ? (
        <div className="border rounded-md p-4 space-y-3 bg-slate-50">
          <p className="font-medium text-sm">Nueva categoría</p>
          <div className="space-y-1">
            <Label>Nombre <span className="text-red-500">*</span></Label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Llantas" autoFocus />
          </div>
          <div className="space-y-1">
            <Label>Descripción <span className="text-xs text-slate-400">(opcional)</span></Label>
            <Input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej: Todo tipo de llantas" />
          </div>
          <div className="flex gap-2">
            <Button onClick={create} disabled={loading || !nombre.trim()}>
              {loading ? 'Guardando...' : 'Crear'}
            </Button>
            <Button variant="outline" onClick={cancelEdit}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => { setCreating(true); setError('') }}>
          <Plus size={16} className="mr-2" />Nueva Categoría
        </Button>
      )}
    </div>
  )
}
