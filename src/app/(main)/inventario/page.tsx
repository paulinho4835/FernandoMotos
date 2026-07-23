import { createClient } from '@/lib/supabase/server'
import { getAuthUser, getPerfil, getConfiguracion } from '@/lib/supabase/session'
import { InventarioClient } from '@/components/inventario/InventarioClient'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { esAdmin } from '@/lib/auth/roles'

export default async function InventarioPage() {
  const supabase = await createClient()
  const user = await getAuthUser()
  const perfil = await getPerfil()
  const isAdmin = esAdmin(perfil?.rol)

  const [{ data: productos }, { data: categorias }, config] = await Promise.all([
    supabase.from('productos').select('*').eq('activo', true).order('nombre'),
    supabase.from('categorias').select('*').eq('activo', true).order('orden').order('nombre'),
    getConfiguracion(),
  ])

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Inventario — Repuestos</h1>
        {isAdmin && (
          <Button asChild>
            <Link href="/inventario/nuevo"><Plus size={16} className="mr-2" />Nuevo Producto</Link>
          </Button>
        )}
      </div>
      <InventarioClient
        productos={productos ?? []}
        categorias={categorias ?? []}
        isAdmin={isAdmin}
        vendedorId={user?.id ?? ''}
        vendedorNombre={perfil?.nombre ?? 'Vendedor'}
        negocioNombre={config?.nombre_negocio ?? 'Importadora de Motos Fernando'}
        negocioDireccion={config?.direccion ?? ''}
        negocioTelefono={config?.telefono ?? ''}
      />
    </div>
  )
}
