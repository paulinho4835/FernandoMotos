import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser, getPerfil, getConfiguracion } from '@/lib/supabase/session'
import { Sidebar } from '@/components/layout/Sidebar'
import { esAdmin, esSuperAdmin } from '@/lib/auth/roles'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const perfil = await getPerfil()

  const isAdmin = esAdmin(perfil?.rol)
  const isSuperAdmin = esSuperAdmin(perfil?.rol)

  const config = await getConfiguracion()
  const moduloCompradoresActivo = config?.modulo_compradores_activo === true
  const moduloPedidosActivo = config?.modulo_pedidos_activo !== false

  const { count: pedidosPendientes } = await supabase
    .from('pedidos')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'pendiente')

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50">
      <Sidebar
        nombre={perfil?.nombre}
        rol={perfil?.rol}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        moduloCompradoresActivo={moduloCompradoresActivo}
        moduloPedidosActivo={moduloPedidosActivo}
        signOut={signOut}
        pedidosPendientes={pedidosPendientes ?? 0}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
