import { createClient } from '@/lib/supabase/server'
import { ClientesClient } from '@/components/clientes/ClientesClient'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: clientes } = await supabase
    .from('clientes').select('*').order('nombre')

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Clientes</h1>
      <ClientesClient clientes={clientes ?? []} />
    </div>
  )
}
