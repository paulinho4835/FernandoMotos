import { createClient } from '@/lib/supabase/server'
import { getAuthUser, getPerfil } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import { ProductForm } from '@/components/inventario/ProductForm'
import { esAdmin } from '@/lib/auth/roles'

export default async function NuevoProductoPage() {
  const supabase = await createClient()
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const perfil = await getPerfil()
  if (!esAdmin(perfil?.rol)) redirect('/inventario')

  const { data: categorias } = await supabase
    .from('categorias').select('*').eq('activo', true).order('orden').order('nombre')

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Nuevo Producto</h1>
      <ProductForm categorias={categorias ?? []} />
    </div>
  )
}
