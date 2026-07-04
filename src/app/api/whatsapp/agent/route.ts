import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { chatCompletion, type ChatMessage } from '@/lib/agent/openrouter'
import { toolDefinitions, executeTool } from '@/lib/agent/tools'
import { buildSystemPrompt } from '@/lib/agent/prompt'
import { agenteActivo, cargarConversacion, guardarConversacion } from '@/lib/agent/queries'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // Auth: secreto compartido con el whatsapp-service.
  const secret = process.env.AGENT_WEBHOOK_SECRET
  if (!secret || request.headers.get('x-agent-secret') !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    from?: string; text?: string; phoneVerified?: boolean
  }
  const from = (body.from ?? '').replace(/[\s.\-]/g, '')
  const text = (body.text ?? '').trim()
  if (!from || !text) return NextResponse.json({ reply: null })

  const supabase = createAdminClient()

  if (!(await agenteActivo(supabase))) return NextResponse.json({ reply: null })

  const conv = await cargarConversacion(supabase, from)
  if (conv.estado === 'pausada') return NextResponse.json({ reply: null })

  const system: ChatMessage = {
    role: 'system',
    content: buildSystemPrompt({
      negocio: 'Importadora de Motos Fernando',
      phoneVerified: body.phoneVerified !== false,
    }),
  }
  const history: ChatMessage[] = [...conv.historial, { role: 'user', content: text }]

  let reply: string | null = null
  // Loop de tool-calling acotado para evitar bucles infinitos.
  for (let i = 0; i < 5; i++) {
    const messages = [system, ...history]
    const out = await chatCompletion({ messages, tools: toolDefinitions })

    if (out.tool_calls && out.tool_calls.length > 0) {
      history.push({ role: 'assistant', content: out.content, tool_calls: out.tool_calls })
      for (const call of out.tool_calls) {
        const result = await executeTool(supabase, call.function.name, call.function.arguments, { telefono: from })
        history.push({ role: 'tool', tool_call_id: call.id, content: result })
      }
      continue
    }

    reply = out.content
    history.push({ role: 'assistant', content: reply })
    break
  }

  // Si el loop se agota sin una respuesta de texto, no dejar al cliente sin
  // contestación ni la falla invisible: registrar y dar un fallback.
  if (reply === null) {
    console.error(`[agent] loop de tool-calling agotado sin respuesta para ${from}`)
    reply = 'Disculpa, tuve un inconveniente para procesar tu mensaje. Un asesor te escribirá enseguida.'
    history.push({ role: 'assistant', content: reply })
  }

  await guardarConversacion(supabase, from, history)
  return NextResponse.json({ reply })
}
