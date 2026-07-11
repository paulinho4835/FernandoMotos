import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VendedoresClient } from '@/components/vendedores/VendedoresClient'
import { esAdmin } from '@/lib/auth/roles'

export default async function VendedoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('perfiles').select('rol').eq('id', user!.id).single()

  if (!esAdmin(perfil?.rol)) redirect('/dashboard')

  const { data: vendedores } = await supabase
    .from('vendedores')
    .select('*')
    .eq('tipo', 'vendedor')
    .order('nombre')

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Vendedores</h1>
      <p className="text-sm text-slate-500">
        Registra los vendedores que aparecerán al realizar una venta.
      </p>
      <VendedoresClient vendedores={vendedores ?? []} />
    </div>
  )
}
