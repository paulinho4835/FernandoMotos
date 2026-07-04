import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }))
vi.mock('@/lib/agent/queries')
vi.mock('@/lib/agent/openrouter')

import { POST } from '@/app/api/whatsapp/agent/route'
import * as queries from '@/lib/agent/queries'
import * as openrouter from '@/lib/agent/openrouter'

function req(body: unknown, secret = 'test-secret') {
  return new Request('http://localhost/api/whatsapp/agent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-agent-secret': secret },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.AGENT_WEBHOOK_SECRET = 'test-secret'
})

describe('POST /api/whatsapp/agent', () => {
  it('401 con secreto inválido', async () => {
    const res = await POST(req({ from: '591', text: 'hola' }, 'malo'))
    expect(res.status).toBe(401)
  })

  it('reply null si el agente está apagado', async () => {
    vi.mocked(queries.agenteActivo).mockResolvedValue(false)
    const res = await POST(req({ from: '591', text: 'hola', phoneVerified: true }))
    expect(await res.json()).toEqual({ reply: null })
  })

  it('reply null si la conversación está pausada', async () => {
    vi.mocked(queries.agenteActivo).mockResolvedValue(true)
    vi.mocked(queries.cargarConversacion).mockResolvedValue({ historial: [], estado: 'pausada' })
    const res = await POST(req({ from: '591', text: 'hola', phoneVerified: true }))
    expect(await res.json()).toEqual({ reply: null })
  })

  it('responde el texto del modelo (sin tools)', async () => {
    vi.mocked(queries.agenteActivo).mockResolvedValue(true)
    vi.mocked(queries.cargarConversacion).mockResolvedValue({ historial: [], estado: 'activa' })
    vi.mocked(queries.guardarConversacion).mockResolvedValue()
    vi.mocked(openrouter.chatCompletion).mockResolvedValue({ content: 'Hola, ¿qué moto buscas?' })
    const res = await POST(req({ from: '591', text: 'hola', phoneVerified: true }))
    expect(await res.json()).toEqual({ reply: 'Hola, ¿qué moto buscas?' })
    expect(queries.guardarConversacion).toHaveBeenCalled()
  })
})
