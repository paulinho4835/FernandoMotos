import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import { CategoriasClient } from '@/components/inventario/CategoriasClient'

export default async function CategoriasPage() {
  const supabase = await createClient()
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const { data: categorias } = await supabase
    .from('categorias')
    .select('*')
    .eq('activo', true)
    .order('orden')
    .order('nombre')

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Categorías de Productos</h1>
        <p className="text-sm text-slate-500 mt-1">Organiza los repuestos en categorías para facilitar la búsqueda.</p>
      </div>
      <CategoriasClient categorias={categorias ?? []} />
    </div>
  )
}
