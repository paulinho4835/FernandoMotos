import type { ChatMessage, LlmCaller, ToolCall } from './types'

type CompletionChoice = {
  message: { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
}

// LlmCaller de fábrica contra OpenRouter (API compatible con OpenAI).
// El modelo se toma de OPENROUTER_MODEL. Lanza si la respuesta no es 2xx.
export function createOpenRouterCaller(opts?: {
  apiKey?: string
  model?: string
  appUrl?: string
  title?: string
}): LlmCaller {
  return async (params: { messages: ChatMessage[]; tools: unknown[] }) => {
    const apiKey = opts?.apiKey ?? process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('Falta OPENROUTER_API_KEY')
    const model = opts?.model ?? process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini'

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': opts?.appUrl ?? process.env.APP_URL ?? 'http://localhost:3000',
        'X-Title': opts?.title ?? 'agent-core',
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        tools: params.tools,
        tool_choice: 'auto',
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenRouter HTTP ${res.status}: ${body}`)
    }

    const data = (await res.json()) as { choices: CompletionChoice[] }
    const msg = data.choices?.[0]?.message
    return { content: msg?.content ?? null, tool_calls: msg?.tool_calls }
  }
}
