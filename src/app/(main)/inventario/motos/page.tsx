import { createClient } from '@/lib/supabase/server'
import { MotosClient } from '@/components/inventario/MotosClient'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { esAdmin } from '@/lib/auth/roles'

export default async function MotosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = user
    ? await supabase.from('perfiles').select('rol, nombre').eq('id', user.id).single()
    : { data: null }

  const isAdmin = esAdmin(perfil?.rol)

  const [{ data: motos }, { data: config }] = await Promise.all([
    supabase.from('motos').select('*').eq('activo', true).order('marca'),
    supabase.from('configuracion').select('nombre_negocio, direccion, telefono').eq('id', 1).single(),
  ])

  const { data: disp } = await supabase
    .from('motos_disponibilidad')
    .select('moto_id, reservado, disponible')
  const disponibilidad = Object.fromEntries(
    (disp ?? []).map((d) => [d.moto_id, { reservado: d.reservado, disponible: d.disponible }]),
  )

  let costos: Record<string, number> | undefined
  if (isAdmin) {
    const { data: costosData } = await supabase
      .from('motos_costos')
      .select('moto_id, costo')
    costos = Object.fromEntries((costosData ?? []).map((c) => [c.moto_id, c.costo]))
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        disponibilidad={disponibilidad}
        costos={costos}
      />
    </div>
  )
}
