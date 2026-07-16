import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MotoTable } from '@/components/inventario/MotoTable'
import type { Moto } from '@/lib/types'

vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }))

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const deleteEq = vi.fn(() =>
  Promise.resolve<{ error: { code: string; message: string } | null }>({ error: null }),
)
const deleteFn = vi.fn(() => ({ eq: deleteEq }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: () => ({ delete: deleteFn }) }),
}))

const moto = {
  id: 'm1', codigo: 'CH1', marca: 'Honda', modelo: 'XR150', color: 'Rojo', anio: 2024,
  motor_cc: 150, numero_motor: 'MT1', numero_chasis: 'CH1', precio_venta: 12000,
  stock: 1, stock_minimo: 0, ubicacion: 'Depósito A', descripcion: null, activo: true,
  fotos: [], created_at: '', updated_at: '',
} as unknown as Moto

beforeEach(() => {
  refresh.mockClear()
  deleteFn.mockClear()
  deleteEq.mockClear()
  deleteEq.mockResolvedValue({ error: null })
})

describe('MotoTable', () => {
  it('muestra encabezado Tipo/CC y no muestra Stock', () => {
    render(<MotoTable motos={[moto]} />)
    expect(screen.getByText('Tipo/CC')).toBeInTheDocument()
    expect(screen.queryByText('Stock')).not.toBeInTheDocument()
  })

  it('muestra la ubicación de la moto', () => {
    render(<MotoTable motos={[moto]} />)
    expect(screen.getByText('Depósito A')).toBeInTheDocument()
  })

  it('muestra chip Reservada cuando hay reserva', () => {
    render(<MotoTable motos={[moto]} disponibilidad={{ m1: { reservado: 1, disponible: 0 } }} />)
    expect(screen.getByText(/reservada/i)).toBeInTheDocument()
  })

  it('muestra Precio de Compra cuando isAdmin=true y hay costos', () => {
    render(<MotoTable motos={[moto]} isAdmin costos={{ m1: 8000 }} />)
    expect(screen.getByText('Precio de Compra')).toBeInTheDocument()
    expect(screen.getByText('Bs. 8.000,00')).toBeInTheDocument()
  })

  it('no muestra Precio de Compra cuando isAdmin=false', () => {
    render(<MotoTable motos={[moto]} costos={{ m1: 8000 }} />)
    expect(screen.queryByText('Precio de Compra')).not.toBeInTheDocument()
    expect(screen.queryByText('Bs. 8.000,00')).not.toBeInTheDocument()
  })

  it('muestra botón Eliminar solo si isAdmin=true', () => {
    const { rerender } = render(<MotoTable motos={[moto]} isAdmin />)
    expect(screen.getByTitle('Eliminar moto')).toBeInTheDocument()

    rerender(<MotoTable motos={[moto]} isAdmin={false} />)
    expect(screen.queryByTitle('Eliminar moto')).not.toBeInTheDocument()
  })

  it('al confirmar, borra la moto y refresca la lista', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<MotoTable motos={[moto]} isAdmin />)

    fireEvent.click(screen.getByTitle('Eliminar moto'))

    await waitFor(() => expect(deleteEq).toHaveBeenCalledWith('id', 'm1'))
    expect(refresh).toHaveBeenCalled()
  })

  it('si se cancela el confirm, no llama a Supabase', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<MotoTable motos={[moto]} isAdmin />)

    fireEvent.click(screen.getByTitle('Eliminar moto'))

    expect(deleteFn).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('muestra mensaje claro cuando la moto ya tiene ventas (FK 23503)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    deleteEq.mockResolvedValue({ error: { code: '23503', message: 'foreign key violation' } })
    render(<MotoTable motos={[moto]} isAdmin />)

    fireEvent.click(screen.getByTitle('Eliminar moto'))

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(
      'No se puede eliminar: esta moto ya tiene una venta registrada en el historial.',
    ))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('muestra el mensaje de error de Supabase para otros errores', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    deleteEq.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } })
    render(<MotoTable motos={[moto]} isAdmin />)

    fireEvent.click(screen.getByTitle('Eliminar moto'))

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('No se pudo eliminar: permission denied'))
  })
})
