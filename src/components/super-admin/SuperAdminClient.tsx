'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function SuperAdminClient({ moduloInicial }: { moduloInicial: boolean }) {
  const [activo, setActivo] = useState(moduloInicial)
  const [saving, setSaving] = useState(false)

  async function toggle() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('configuracion')
      .update({ modulo_compradores_activo: !activo, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (error) toast.error(error.message)
    else { setActivo(!activo); toast.success(!activo ? 'Módulo activado' : 'Módulo desactivado') }
    setSaving(false)
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-white max-w-lg">
      <p className="font-semibold">Módulos</p>
      <div className="flex items-center justify-between border-t pt-4">
        <div>
          <p className="font-medium">Compradores</p>
          <p className="text-sm text-slate-500">Panel con los compradores del agente, su adelanto y saldo.</p>
        </div>
        <Button variant={activo ? 'default' : 'outline'} disabled={saving} onClick={toggle}>
          {activo ? 'Activado' : 'Desactivado'}
        </Button>
      </div>
    </div>
  )
}
