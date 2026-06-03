'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Vendedor } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Toaster } from 'sonner'
import { Plus, Trash2, UserCheck, UserX } from 'lucide-react'

interface Props { vendedores: Vendedor[] }

export function VendedoresClient({ vendedores: inicial }: Props) {
  const [lista, setLista] = useState<Vendedor[]>(inicial)
  const [nuevo, setNuevo] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function agregar() {
    const nombre = nuevo.trim()
    if (!nombre) return
    setGuardando(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('vendedores')
      .insert({ nombre, tipo: 'vendedor' })
      .select()
      .single()
    if (error) { toast.error(error.message); setGuardando(false); return }
    setLista(l => [...l, data as Vendedor])
    setNuevo('')
    toast.success(`Vendedor "${nombre}" registrado`)
    setGuardando(false)
  }

  async function toggleActivo(v: Vendedor) {
    const supabase = createClient()
    const { error } = await supabase
      .from('vendedores')
      .update({ activo: !v.activo })
      .eq('id', v.id)
    if (error) { toast.error(error.message); return }
    setLista(l => l.map(x => x.id === v.id ? { ...x, activo: !x.activo } : x))
  }

  async function eliminar(v: Vendedor) {
    if (!confirm(`¿Eliminar a "${v.nombre}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('vendedores').delete().eq('id', v.id)
    if (error) { toast.error('No se puede eliminar — tiene ventas asociadas'); return }
    setLista(l => l.filter(x => x.id !== v.id))
    toast.success('Vendedor eliminado')
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Toaster />

      {/* Agregar */}
      <div className="flex gap-2">
        <Input
          placeholder="Nombre del vendedor"
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregar()}
        />
        <Button onClick={agregar} disabled={guardando || !nuevo.trim()}>
          <Plus size={16} className="mr-1" />
          Agregar
        </Button>
      </div>

      {/* Lista */}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Estado</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {lista.map(v => (
              <tr key={v.id} className="border-t hover:bg-slate-50">
                <td className="p-3 font-medium">{v.nombre}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggleActivo(v)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                      v.activo
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {v.activo ? <UserCheck size={12} /> : <UserX size={12} />}
                    {v.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => eliminar(v)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-slate-400">
                  No hay vendedores registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
