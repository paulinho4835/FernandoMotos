import type { ChatMessage, ConversationStore } from './types'

// Forma mínima que necesitamos de un SupabaseClient. Deliberadamente NO
// importamos el tipo nominal de @supabase/supabase-js: dos copias de ese
// paquete en node_modules (una por proyecto que consume este core vía
// file:/npm, otra en el propio core) generan choques de tipos porque sus
// clases usan miembros `protected` (identidad nominal, no estructural).
// `from` queda en `any`: comparar estructuralmente el `from()` real de
// supabase-js (decenas de overloads genéricos por tabla) contra un shape
// propio hace que tsc explote con "Type instantiation is excessively deep".
// Cualquier cliente real de supabase-js cumple esta forma sin cast.
type SupabaseLike = {
  from: (table: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}

// ConversationStore de fábrica sobre Supabase. La tabla es configurable pero
// el esquema esperado es fijo:
//
//   create table conversaciones_wa (
//     telefono text primary key,
//     historial jsonb not null default '[]',
//     estado text not null default 'activa',   -- 'activa' | 'pausada'
//     cliente_nombre text,
//     updated_at timestamptz not null default now()
//   );
export function createSupabaseStore(
  supabase: SupabaseLike,
  opts?: { table?: string },
): ConversationStore {
  const table = opts?.table ?? 'conversaciones_wa'
  return {
    async load(telefono) {
      const { data } = await supabase
        .from(table)
        .select('historial, estado')
        .eq('telefono', telefono)
        .maybeSingle()
      if (!data) return { historial: [], estado: 'activa' }
      return {
        historial: (data.historial ?? []) as ChatMessage[],
        estado: data.estado === 'pausada' ? 'pausada' : 'activa',
      }
    },
    async save(telefono, historial) {
      const { error } = await supabase
        .from(table)
        .upsert(
          { telefono, historial, updated_at: new Date().toISOString() },
          { onConflict: 'telefono' },
        )
      if (error) throw error
    },
    async pause(telefono) {
      const { error } = await supabase
        .from(table)
        .upsert(
          { telefono, estado: 'pausada', updated_at: new Date().toISOString() },
          { onConflict: 'telefono' },
        )
      if (error) throw error
    },
  }
}
