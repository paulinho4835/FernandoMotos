import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { MotoForm } from '@/components/inventario/MotoForm'

export default async function EditarMotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') redirect('/inventario/motos')
  const { data: moto } = await supabase.from('motos').select('*').eq('id', id).single()
  if (!moto) notFound()

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Editar Moto</h1>
      <MotoForm moto={moto} />
    </div>
  )
}
