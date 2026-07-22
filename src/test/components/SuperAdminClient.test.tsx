import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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

function botonCompradores() {
  const titulo = screen.getByText('Compradores')
  const fila = titulo.closest('div')?.parentElement as HTMLElement
  return within(fila).getByRole('button', { name: /activado|desactivado/i })
}

describe('SuperAdminClient', () => {
  it('muestra el estado inicial del toggle', () => {
    render(<SuperAdminClient moduloInicial={false} />)
    expect(screen.getByText('Compradores')).toBeInTheDocument()
    expect(botonCompradores()).toHaveTextContent(/desactivado/i)
  })

  it('al hacer click actualiza el flag en configuracion', async () => {
    render(<SuperAdminClient moduloInicial={false} />)
    fireEvent.click(botonCompradores())
    await waitFor(() => expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ modulo_compradores_activo: true }),
    ))
  })

  it('muestra error y NO activa cuando la escritura afecta 0 filas (RLS bloquea)', async () => {
    select.mockReturnValueOnce({ data: [], error: null })
    render(<SuperAdminClient moduloInicial={false} />)
    fireEvent.click(botonCompradores())
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'No se pudo guardar: sin permiso para modificar la configuración.'
      )
    )
    expect(toast.success).not.toHaveBeenCalled()
    expect(botonCompradores()).toHaveTextContent(/desactivado/i)
  })

  it('muestra los toggles de Pedidos y Agente de WhatsApp', () => {
    render(<SuperAdminClient moduloInicial={false} />)
    expect(screen.getByText('Pedidos')).toBeInTheDocument()
    expect(screen.getByText('Agente de WhatsApp')).toBeInTheDocument()
  })

  it('muestra el toggle de Fotos de motos', () => {
    render(<SuperAdminClient moduloInicial={false} />)
    expect(screen.getByText('Fotos de motos')).toBeInTheDocument()
  })
})
