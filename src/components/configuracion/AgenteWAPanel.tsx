'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const WA_URL = process.env.NEXT_PUBLIC_WA_SERVICE_URL ?? 'http://localhost:3001'
const NEGOCIO = 'fernando'

export function AgenteWAPanel({ activoInicial }: { activoInicial: boolean }) {
  const [activo, setActivo] = useState(activoInicial)
  const [connected, setConnected] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${WA_URL}/qr-data/${NEGOCIO}`)
      const d = await r.json()
      setConnected(Boolean(d.connected))
      setQr(d.qr ?? null)
    } catch { /* servicio no disponible */ }
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
  }, [refresh])

  async function toggle() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('configuracion').update({ agente_wa_activo: !activo, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) toast.error(error.message)
    else { setActivo(!activo); toast.success(!activo ? 'Agente activado' : 'Agente desactivado') }
    setSaving(false)
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Agente de WhatsApp</p>
          <p className="text-sm text-slate-500">Atiende clientes y arma pedidos de motos.</p>
        </div>
        <Button variant={activo ? 'default' : 'outline'} disabled={saving} onClick={toggle}>
          {activo ? 'Activado' : 'Desactivado'}
        </Button>
      </div>
      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-2">Conexión de WhatsApp</p>
        {connected ? (
          <p className="text-sm text-green-600">✅ Conectado</p>
        ) : qr ? (
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR de WhatsApp" className="mx-auto w-56 h-56" />
            <p className="text-xs text-slate-500 mt-1">WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Servicio no disponible o generando QR…</p>
        )}
      </div>
    </div>
  )
}
