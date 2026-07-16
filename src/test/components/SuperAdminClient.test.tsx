import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SuperAdminClient } from '@/components/super-admin/SuperAdminClient'
import { toast } from 'sonner'

const update = vi.fn()
const select = vi.fn(() => ({ data: [{ id: 1 }], error: null }))
const eq = vi.fn(() => ({ select }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({ update: (v: unknown) => { update(v); return { eq } } }),
  }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  update.mockClear()
  eq.mockClear()
  select.mockClear()
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
})

describe('SuperAdminClient', () => {
  it('muestra el estado inicial del toggle', () => {
    render(<SuperAdminClient moduloInicial={false} />)
    expect(screen.getByText('Compradores')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /desactivado/i })).toBeInTheDocument()
  })

  it('al hacer click actualiza el flag en configuracion', async () => {
    render(<SuperAdminClient moduloInicial={false} />)
    fireEvent.click(screen.getByRole('button', { name: /desactivado/i }))
    await waitFor(() => expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ modulo_compradores_activo: true }),
    ))
  })

  it('muestra error y NO activa cuando la escritura afecta 0 filas (RLS bloquea)', async () => {
    select.mockReturnValueOnce({ data: [], error: null })
    render(<SuperAdminClient moduloInicial={false} />)
    fireEvent.click(screen.getByRole('button', { name: /desactivado/i }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'No se pudo guardar: sin permiso para modificar la configuración.'
      )
    )
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /desactivado/i })).toBeInTheDocument()
  })
})
