'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function formatUltimoBackup(iso: string | null): string {
  if (!iso) return 'nunca'
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'hace 1 día'
  return `hace ${dias} días`
}

export function SuperAdminClient({
  moduloInicial,
  ultimoBackupInicial = null,
}: {
  moduloInicial: boolean
  ultimoBackupInicial?: string | null
}) {
  const [activo, setActivo] = useState(moduloInicial)
  const [saving, setSaving] = useState(false)
  const [ultimoBackup, setUltimoBackup] = useState(ultimoBackupInicial)
  const [descargando, setDescargando] = useState(false)

  async function toggle() {
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('configuracion')
      .update({ modulo_compradores_activo: !activo, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('id')
    if (error) toast.error(error.message)
    else if (!data || data.length === 0) toast.error('No se pudo guardar: sin permiso para modificar la configuración.')
    else { setActivo(!activo); toast.success(!activo ? 'Módulo activado' : 'Módulo desactivado') }
    setSaving(false)
  }

  async function descargarBackup() {
    setDescargando(true)
    try {
      const res = await fetch('/api/super-admin/backup')
      if (!res.ok) {
        toast.error('No se pudo generar el backup.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-motos-fernando-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setUltimoBackup(new Date().toISOString())
      toast.success('Backup descargado')
    } catch {
      toast.error('No se pudo generar el backup.')
    } finally {
      setDescargando(false)
    }
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

      <div className="flex items-center justify-between border-t pt-4">
        <div>
          <p className="font-medium">Backup</p>
          <p className="text-sm text-slate-500">
            Exporta clientes, productos, motos, ventas y detalle de ventas en un .json.
          </p>
          <p className="text-xs text-slate-400">Último backup: {formatUltimoBackup(ultimoBackup)}</p>
        </div>
        <Button variant="outline" disabled={descargando} onClick={descargarBackup}>
          {descargando ? 'Generando…' : 'Descargar backup'}
        </Button>
      </div>
    </div>
  )
}
