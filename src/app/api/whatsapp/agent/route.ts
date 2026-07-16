import { createWhatsAppHandler, createSupabaseStore } from '@paulo/agent-core'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAgentConfig } from '@/lib/agent/config'
import { agenteActivo } from '@/lib/agent/queries'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const handler = createWhatsAppHandler({
    config: buildAgentConfig(supabase),
    getStore: () => createSupabaseStore(supabase),
    isActive: () => agenteActivo(supabase),
  })
  return handler(request)
}
