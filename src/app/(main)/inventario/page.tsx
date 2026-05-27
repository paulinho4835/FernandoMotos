import { createClient } from '@/lib/supabase/server'
import { ProductTable } from '@/components/inventario/ProductTable'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function InventarioPage() {
  const supabase = await createClient()
  const { data: productos } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('nombre')

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventario — Repuestos</h1>
        <Button asChild>
          <Link href="/inventario/nuevo"><Plus size={16} className="mr-2" />Nuevo Producto</Link>
        </Button>
      </div>
      <ProductTable productos={productos ?? []} />
    </div>
  )
}
