import { createClient } from '@/lib/supabase/server'
import { getAuthUser, getPerfil } from '@/lib/supabase/session'
import { redirect, notFound } from 'next/navigation'
import { ProductForm } from '@/components/inventario/ProductForm'
import { esAdmin } from '@/lib/auth/roles'

export default async function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const perfil = await getPerfil()
  if (!esAdmin(perfil?.rol)) redirect('/inventario')

  const [{ data: producto }, { data: categorias }] = await Promise.all([
    supabase.from('productos').select('*').eq('id', id).single(),
    supabase.from('categorias').select('*').eq('activo', true).order('orden').order('nombre'),
  ])
  if (!producto) notFound()

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Editar Producto</h1>
      <ProductForm producto={producto} categorias={categorias ?? []} />
    </div>
  )
}
