'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

interface Props {
  nombreInicial: string
  direccionInicial: string
  telefonoInicial: string
}

export function ConfiguracionForm({ nombreInicial, direccionInicial, telefonoInicial }: Props) {
  const router = useRouter()
  const [nombre, setNombre] = useState(nombreInicial)
  const [direccion, setDireccion] = useState(direccionInicial)
  const [telefono, setTelefono] = useState(telefonoInicial)
  const [loading, setLoading] = useState(false)

  const sinCambios =
    nombre.trim() === nombreInicial.trim() &&
    direccion.trim() === direccionInicial.trim() &&
    telefono.trim() === telefonoInicial.trim()

  async function handleGuardar() {
    const limpio = nombre.trim()
    if (!limpio) {
      toast.error('El nombre del negocio no puede estar vacío')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('configuracion')
      .update({
        nombre_negocio: limpio,
        direccion: direccion.trim() || null,
        telefono: telefono.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (error) {
      toast.error(`ERROR: no se guardó. ${error.message}`)
    } else {
      toast.success('Datos del negocio actualizados')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="max-w-lg space-y-6">
      <Toaster />
      <div className="rounded-xl border bg-white p-5 space-y-4">
        <div className="space-y-1">
          <Label htmlFor="nombre_negocio">Nombre del negocio</Label>
          <Input
            id="nombre_negocio"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Importadora de Motos Fernando"
            maxLength={80}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="direccion_negocio">Dirección <span className="text-xs text-slate-400">(opcional)</span></Label>
          <Input
            id="direccion_negocio"
            value={direccion}
            onChange={e => setDireccion(e.target.value)}
            placeholder="Ej: Av. Principal #123, Santa Cruz"
            maxLength={120}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="telefono_negocio">Teléfono <span className="text-xs text-slate-400">(opcional)</span></Label>
          <Input
            id="telefono_negocio"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            placeholder="Ej: 70012345"
            maxLength={30}
          />
        </div>

        <p className="text-xs text-slate-500">
          Este nombre, dirección y teléfono aparecen en el encabezado del recibo PDF al confirmar una venta.
        </p>

        <div className="rounded-lg border bg-slate-50 p-3 space-y-0.5">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Vista previa del recibo</p>
          <p className="text-center font-bold text-sm">{nombre.trim() || 'Importadora de Motos Fernando'}</p>
          {direccion.trim() && <p className="text-center text-xs text-slate-600">{direccion.trim()}</p>}
          {telefono.trim() && <p className="text-center text-xs text-slate-600">Tel: {telefono.trim()}</p>}
        </div>

        <Button onClick={handleGuardar} disabled={loading || sinCambios}>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}
