# @paulo/agent-core

Core reutilizable de agentes conversacionales (WhatsApp / voz) con tool-calling.
Extraído de los proyectos Importadora de Motos Fernando y Clínica Dental, con
todas las lecciones de producción incorporadas de fábrica:

- **Loop de tool-calling acotado** con fallback si se agota.
- **`parseToolArgs`**: nunca `JSON.parse` a ciegas (bug "el webhook miente con ok" — Vapi/OpenRouter mandan `arguments` como objeto O string).
- **Guard anti-mentira**: si una tool de acción (`isAction: true`) se intentó y ninguna devolvió `OK:`, el core reemplaza en código una confirmación inventada del LLM.
- **Convención de resultados**: éxito = `"OK: ..."`, fallo = `"ERROR: qué NO pasó + instrucción correctiva para el LLM"`.
- **Normalización** de teléfonos, carnets, fechas y horas dictados por voz/chat.
- **Persistencia** de conversación con estado `activa`/`pausada` (Supabase de fábrica, interfaz `ConversationStore` para cualquier otra cosa).
- **Handoff a humano** integrado: la tool marca el contexto y el core pausa la conversación.

## Instalación en un proyecto

```bash
npm i github:TU_USUARIO/agent-core
```

(El `prepare` script compila TypeScript al instalar desde git.)

## Qué escribe cada rubro

Solo 3 cosas: **prompt**, **tools** y sus **queries** de DB. Nada más.

```typescript
// lib/agent/config.ts
import { type AgentConfig, type AgentTool, createHandoffTool } from '@paulo/agent-core'
import type { SupabaseClient } from '@supabase/supabase-js'

export function buildAgentConfig(supabase: SupabaseClient): AgentConfig {
  const buscarProductos: AgentTool = {
    name: 'buscar_productos',
    description: 'Busca productos por nombre o precio. Úsalo SIEMPRE antes de afirmar precio o stock.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
    },
    execute: async (args, ctx) => {
      const rows = await miQueryDeRubro(supabase, args) // ← query del proyecto
      if (rows.length === 0) return 'No se encontraron productos. Pide al cliente que ajuste la búsqueda.'
      return JSON.stringify(rows)
    },
  }

  const crearPedido: AgentTool = {
    name: 'crear_pedido',
    description: 'Crea un pedido pendiente. Requiere el nombre del cliente.',
    parameters: {
      type: 'object',
      properties: { producto_id: { type: 'string' }, cliente_nombre: { type: 'string' } },
      required: ['producto_id', 'cliente_nombre'],
    },
    isAction: true, // ← activa el guard anti-mentira
    execute: async (args, ctx) => {
      if (!args.cliente_nombre) return 'ERROR: el pedido NO se creó. Falta el nombre del cliente. Pídelo y vuelve a llamar crear_pedido.'
      const id = await insertarPedido(supabase, args, ctx.telefono)
      return `OK: pedido creado (ref ${id.slice(0, 8)}). Un vendedor lo confirmará.`
    },
  }

  return {
    negocio: 'Mi Negocio',
    buildSystemPrompt: ({ negocio, meta }) => [
      `Eres el asesor de ventas por WhatsApp de "${negocio}".`,
      'Español neutro, cordial y breve. Sin voseo.',
      'REGLAS CRÍTICAS:',
      '1. NUNCA inventes precios ni stock: llama SIEMPRE a las herramientas antes de afirmar.',
      '2. Solo confirma éxito si el resultado empieza con "OK:". Si empieza con "ERROR:", NO inventes confirmación.',
      meta.phoneVerified === 'false' ? '3. Pide el número de celular antes de crear un pedido.' : '',
    ].filter(Boolean).join('\n'),
    tools: [buscarProductos, crearPedido, createHandoffTool()],
  }
}
```

```typescript
// app/api/whatsapp/agent/route.ts — el route COMPLETO del proyecto
import { createWhatsAppHandler, createSupabaseStore } from '@paulo/agent-core'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAgentConfig } from '@/lib/agent/config'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const handler = createWhatsAppHandler({
    config: buildAgentConfig(supabase),
    getStore: () => createSupabaseStore(supabase),
    isActive: async () => {
      const { data } = await supabase.from('configuracion').select('agente_wa_activo').eq('id', 1).maybeSingle()
      return data?.agente_wa_activo === true
    },
  })
  return handler(request)
}
```

## Tabla requerida (Supabase)

```sql
create table conversaciones_wa (
  telefono text primary key,
  historial jsonb not null default '[]',
  estado text not null default 'activa',
  cliente_nombre text,
  updated_at timestamptz not null default now()
);
```

## Env vars

| Variable | Uso |
|---|---|
| `OPENROUTER_API_KEY` | obligatoria |
| `OPENROUTER_MODEL` | default `openai/gpt-4o-mini` |
| `AGENT_WEBHOOK_SECRET` | obligatoria — sin secret el handler rechaza todo |
| `APP_URL` | referer para OpenRouter |

## Reglas de la convención de tools (NO negociables)

1. Éxito de acción → resultado empieza con `OK:`.
2. Fallo → empieza con `ERROR:`, dice qué **NO** pasó y qué debe hacer el LLM.
3. Toda tool que ejecuta una acción lleva `isAction: true`.
4. El system prompt siempre incluye la regla "solo confirma éxito si el resultado empieza con OK:".
5. Tools relacionadas sobre la misma entidad aceptan los MISMOS identificadores (misma cascada de resolución).
