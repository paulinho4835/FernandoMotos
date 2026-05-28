import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  LayoutDashboard, Package, Bike, ShoppingCart,
  History, Users, LogOut, Tag
} from 'lucide-react'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, nombre')
    .eq('id', user.id)
    .single()

  const isAdmin = perfil?.rol === 'admin'

  const navItems = [
    { href: '/inventario', label: 'Repuestos', icon: Package },
    { href: '/inventario/motos', label: 'Motos', icon: Bike },
    { href: '/historial', label: 'Ventas', icon: History },
    { href: '/caja', label: 'Caja', icon: ShoppingCart },
    ...(isAdmin ? [{ href: '/categorias', label: 'Categorías', icon: Tag }] : []),
    { href: '/clientes', label: 'Clientes', icon: Users },
    ...(isAdmin ? [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
  ]

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <p className="font-bold text-sm">Importadora Fernando</p>
          <p className="text-xs text-slate-400 truncate">{perfil?.nombre}</p>
          <span className="text-xs bg-slate-700 px-2 py-0.5 rounded capitalize">
            {perfil?.rol}
          </span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-slate-700 transition-colors">
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="p-2">
          <button type="submit"
            className="flex items-center gap-2 px-3 py-2 rounded text-sm w-full hover:bg-slate-700 text-slate-400 hover:text-slate-100">
            <LogOut size={16} />
            Salir
          </button>
        </form>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
