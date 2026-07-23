import { cache } from 'react'
import { createClient } from './server'
import type { Perfil, Configuracion } from '@/lib/types'

// auth.getUser() hace una verificacion JWT real (costo de CPU, no solo I/O).
// cache() dedupe por request: layout.tsx y cada page.tsx bajo (main)/ llaman
// a estas mismas funciones en vez de repetir su propio getUser()/query.
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getPerfil = cache(async (): Promise<Perfil | null> => {
  const user = await getAuthUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
  return data
})

export const getConfiguracion = cache(async (): Promise<Configuracion | null> => {
  const supabase = await createClient()
  const { data } = await supabase.from('configuracion').select('*').eq('id', 1).maybeSingle()
  return data
})
