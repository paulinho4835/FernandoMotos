'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Bike,
  History, Users, LogOut, Tag, UserCog, BarChart3, Settings,
  Menu, X, ClipboardList, ShieldCheck, Contact,
} from 'lucide-react'

interface Props {
  nombre?: string
  rol?: string
  isAdmin: boolean
  isSuperAdmin: boolean
  moduloCompradoresActivo: boolean
  moduloPedidosActivo: boolean
  signOut: () => Promise<void>
  pedidosPendientes?: number
}

export function Sidebar({ nombre, rol, isAdmin, isSuperAdmin, moduloCompradoresActivo, moduloPedidosActivo, signOut, pedidosPendientes }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: '/inventario', label: 'Repuestos', icon: Package },
    { href: '/inventario/motos', label: 'Motos', icon: Bike },
    { href: '/historial', label: 'Ventas', icon: History },
    { href: '/clientes', label: 'Clientes', icon: Users },
    ...(moduloPedidosActivo ? [
      { href: '/pedidos', label: 'Pedidos', icon: ClipboardList },
    ] : []),
    ...(isAdmin && moduloCompradoresActivo ? [
      { href: '/compradores', label: 'Compradores', icon: Contact },
    ] : []),
    ...(isAdmin ? [
      { href: '/categorias', label: 'Categorías', icon: Tag },
      { href: '/vendedores', label: 'Vendedores', icon: UserCog },
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/reportes', label: 'Reportes', icon: BarChart3 },
      { href: '/configuracion', label: 'Configuración', icon: Settings },
    ] : []),
    ...(isSuperAdmin ? [
      { href: '/super-admin', label: 'Super Admin', icon: ShieldCheck },
    ] : []),
  ]

  // Cerrar el drawer al navegar
  useEffect(() => { setOpen(false) }, [pathname])

  const nav = (
    <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
      {navItems.map(item => (
        <Link key={item.href} href={item.href}
          className="flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-slate-700 transition-colors">
          <item.icon size={16} />
          <span className="flex-1">{item.label}</span>
          {item.href === '/pedidos' && (pedidosPendientes ?? 0) > 0 && (
            <span className="text-xs bg-green-500 text-white rounded-full px-2 py-0.5">{pedidosPendientes}</span>
          )}
        </Link>
      ))}
    </nav>
  )

  const header = (
    <div className="p-4 border-b border-slate-700">
      <p className="font-bold text-sm">Importadora Fernando</p>
      <p className="text-xs text-slate-400 truncate">{nombre}</p>
      <span className="text-xs bg-slate-700 px-2 py-0.5 rounded capitalize">
        {rol}
      </span>
    </div>
  )

  const logout = (
    <form action={signOut} className="p-2">
      <button type="submit"
        className="flex items-center gap-2 px-3 py-2 rounded text-sm w-full hover:bg-slate-700 text-slate-400 hover:text-slate-100">
        <LogOut size={16} />
        Salir
      </button>
    </form>
  )

  return (
    <>
      {/* Barra superior — solo móvil */}
      <header className="md:hidden flex items-center gap-3 h-14 px-4 bg-slate-900 text-slate-100 shrink-0">
        <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="p-1 -ml-1">
          <Menu size={22} />
        </button>
        <p className="font-bold text-sm">Importadora Fernando</p>
      </header>

      {/* Sidebar fijo — escritorio */}
      <aside className="hidden md:flex w-56 bg-slate-900 text-slate-100 flex-col shrink-0">
        {header}
        {nav}
        {logout}
      </aside>

      {/* Drawer — móvil */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative w-64 max-w-[80%] bg-slate-900 text-slate-100 flex flex-col h-full shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-100"
            >
              <X size={20} />
            </button>
            {header}
            {nav}
            {logout}
          </aside>
        </div>
      )}
    </>
  )
}
