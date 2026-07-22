import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MotoForm } from '@/components/inventario/MotoForm'
import { esAdmin } from '@/lib/auth/roles'

export default async function NuevaMotoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (!esAdmin(perfil?.rol)) redirect('/inventario/motos')
  const { data: config } = await supabase
    .from('configuracion').select('modulo_fotos_motos_activo').eq('id', 1).maybeSingle()

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Registrar Moto</h1>
      <MotoForm fotosActivo={config?.modulo_fotos_motos_activo ?? false} />
    </div>
  )
}
