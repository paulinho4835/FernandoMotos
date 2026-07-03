import { createClient } from '@/lib/supabase/server'
import { MotosClient } from '@/components/inventario/MotosClient'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function MotosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = user
    ? await supabase.from('perfiles').select('rol, nombre').eq('id', user.id).single()
    : { data: null }

  const isAdmin = perfil?.rol === 'admin'

  const [{ data: motos }, { data: config }] = await Promise.all([
    supabase.from('motos').select('*').eq('activo', true).order('marca'),
    supabase.from('configuracion').select('nombre_negocio, direccion, telefono').eq('id', 1).single(),
  ])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventario — Motos</h1>
        {isAdmin && (
          <Button asChild>
            <Link href="/inventario/motos/nueva"><Plus size={16} className="mr-2" />Nueva Moto</Link>
          </Button>
        )}
      </div>
      <MotosClient
        motos={motos ?? []}
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
