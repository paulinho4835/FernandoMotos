import { createClient } from '@/lib/supabase/server'
import { getAuthUser, getPerfil, getConfiguracion } from '@/lib/supabase/session'
import { redirect, notFound } from 'next/navigation'
import { MotoForm } from '@/components/inventario/MotoForm'
import { esAdmin } from '@/lib/auth/roles'

export default async function EditarMotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const perfil = await getPerfil()
  if (!esAdmin(perfil?.rol)) redirect('/inventario/motos')
  const { data: moto } = await supabase.from('motos').select('*').eq('id', id).single()
  if (!moto) notFound()
  const [{ data: costoRow }, config] = await Promise.all([
    supabase.from('motos_costos').select('costo').eq('moto_id', id).maybeSingle(),
    getConfiguracion(),
  ])

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Editar Moto</h1>
      <MotoForm
        moto={moto}
        costoInicial={costoRow?.costo ?? undefined}
        fotosActivo={config?.modulo_fotos_motos_activo ?? false}
      />
    </div>
  )
}
