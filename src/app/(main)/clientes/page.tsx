import { createClient } from '@/lib/supabase/server'
import type { Cliente } from '@/lib/types'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: clientes } = await supabase
    .from('clientes').select('*').order('nombre')

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Clientes</h1>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">NIT</th>
              <th className="text-left p-3">Teléfono</th>
              <th className="text-left p-3">Registrado</th>
            </tr>
          </thead>
          <tbody>
            {(clientes ?? []).map((c: Cliente) => (
              <tr key={c.id} className="border-t hover:bg-slate-50">
                <td className="p-3 font-medium">{c.nombre}</td>
                <td className="p-3 text-slate-500">{c.nit ?? '—'}</td>
                <td className="p-3 text-slate-500">{c.telefono ?? '—'}</td>
                <td className="p-3 text-slate-500 text-xs">
                  {new Date(c.created_at).toLocaleDateString('es-BO')}
                </td>
              </tr>
            ))}
            {!clientes?.length && (
              <tr><td colSpan={4} className="p-6 text-center text-slate-400">Sin clientes</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
