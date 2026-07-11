import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CompradoresClient, type Comprador } from '@/components/compradores/CompradoresClient'

const update = vi.fn()
const eq = vi.fn(() => ({ error: null }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: () => ({ update: (v: unknown) => { update(v); return { eq } } }) }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }))

const base: Comprador = {
  id: 'p1', cliente_nombre: 'Juan Perez', cliente_telefono: '59170000000',
  precio_ofertado: 12000, adelanto: 2000, estado: 'pendiente', origen: 'whatsapp',
  notas: null, created_at: '2026-07-10T12:00:00Z',
  motos: { marca: 'Honda', modelo: 'XR150', precio_venta: 12500 },
}

beforeEach(() => { update.mockClear(); eq.mockClear() })

describe('CompradoresClient', () => {
  it('renderiza el comprador con su saldo (precio - adelanto)', () => {
    render(<CompradoresClient pedidos={[base]} />)
    expect(screen.getByText('Juan Perez')).toBeInTheDocument()
    expect(screen.getByText('Honda XR150')).toBeInTheDocument()
    // saldo = 12000 - 2000 = 10000
    expect(screen.getByText(/10.000,00/)).toBeInTheDocument()
  })

  it('filtra por estado', () => {
    const otro: Comprador = { ...base, id: 'p2', cliente_nombre: 'Ana', estado: 'confirmado' }
    render(<CompradoresClient pedidos={[base, otro]} />)
    fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: 'confirmado' } })
    expect(screen.queryByText('Juan Perez')).not.toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })

  it('guarda un nuevo adelanto llamando al update', async () => {
    render(<CompradoresClient pedidos={[base]} />)
    fireEvent.click(screen.getByRole('button', { name: /editar adelanto/i }))
    fireEvent.change(screen.getByLabelText(/nuevo adelanto/i), { target: { value: '3000' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))
    await waitFor(() => expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ adelanto: 3000 }),
    ))
  })
})
