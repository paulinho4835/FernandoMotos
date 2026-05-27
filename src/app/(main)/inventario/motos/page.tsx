import { createClient } from '@/lib/supabase/server'
import { MotoTable } from '@/components/inventario/MotoTable'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function MotosPage() {
  const supabase = await createClient()
  const { data: motos } = await supabase
    .from('motos').select('*').eq('activo', true).order('marca')

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventario — Motos</h1>
        <Button asChild>
          <Link href="/inventario/motos/nueva"><Plus size={16} className="mr-2" />Nueva Moto</Link>
        </Button>
      </div>
      <MotoTable motos={motos ?? []} />
    </div>
  )
}
