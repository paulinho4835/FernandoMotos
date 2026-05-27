import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CajaClient } from './CajaClient'

export default async function CajaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('perfiles').select('nombre').eq('id', user.id).single()

  return <CajaClient vendedorId={user.id} vendedorNombre={perfil?.nombre ?? 'Vendedor'} />
}
