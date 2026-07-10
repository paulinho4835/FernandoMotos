import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/agent/queries')

type FakeRow = { estado?: string; historial?: unknown[] } | null

function createFakeSupabase(row: FakeRow) {
  let current = row
  return {
    from: (table: string) => {
      if (table !== 'conversaciones_wa') throw new Error(`tabla inesperada: ${table}`)
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: current }),
          }),
        }),
        upsert: async (data: Record<string, unknown>) => {
          current = { ...(current ?? {}), ...data } as never
          return { error: null }
        },
      }
    },
  }
}

let fakeSupabase = createFakeSupabase(null)
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => fakeSupabase }))

import { POST } from '@/app/api/whatsapp/agent/route'
import * as queries from '@/lib/agent/queries'

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
  process.env.OPENROUTER_API_KEY = 'test-key'
  fakeSupabase = createFakeSupabase(null)
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
    fakeSupabase = createFakeSupabase({ estado: 'pausada', historial: [] })
    const res = await POST(req({ from: '591', text: 'hola', phoneVerified: true }))
    expect(await res.json()).toEqual({ reply: null })
  })

  it('responde el texto del modelo (sin tools)', async () => {
    vi.mocked(queries.agenteActivo).mockResolvedValue(true)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Hola, ¿qué moto buscas?' } }],
        }),
      }),
    )
    const res = await POST(req({ from: '591', text: 'hola', phoneVerified: true }))
    expect(await res.json()).toEqual({ reply: 'Hola, ¿qué moto buscas?' })
  })
})
