import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MotoSearch } from '@/components/pos/MotoSearch'
import { useMotoCartStore } from '@/lib/store/motoCartStore'
import type { Moto } from '@/lib/types'

const mockMoto: Moto = {
  id: 'm1',
  codigo: 'MOT001',
  marca: 'Honda',
  modelo: 'CB150',
  anio: 2023,
  color: 'Rojo',
  motor_cc: 150,
  numero_motor: 'ENG001',
  numero_chasis: 'CHS001',
  precio_venta: 8500,
  stock: 3,
  stock_minimo: 1,
  descripcion: null,
  fotos: [],
  activo: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
}

const mockSelectQuery = vi.fn()
const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: mockSelectQuery,
}
const mockFrom = vi.fn(() => mockChain)

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

beforeEach(() => {
  useMotoCartStore.setState({ items: [] })
  vi.useFakeTimers()
  mockSelectQuery.mockResolvedValue({ data: [mockMoto], error: null })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

async function buscarMoto(query = 'Honda') {
  fireEvent.change(screen.getByPlaceholderText('Buscar por código, marca o modelo...'), { target: { value: query } })
  await act(async () => { await vi.advanceTimersByTimeAsync(350) })
}

describe('MotoSearch — renderizado', () => {
  it('muestra el input de búsqueda', () => {
    render(<MotoSearch />)
    expect(screen.getByPlaceholderText('Buscar por código, marca o modelo...')).toBeInTheDocument()
  })

  it('no muestra resultados al inicio', () => {
    render(<MotoSearch />)
    expect(screen.queryByText(/Honda/)).not.toBeInTheDocument()
  })
})

describe('MotoSearch — búsqueda', () => {
  it('no busca con menos de 2 caracteres', async () => {
    render(<MotoSearch />)
    fireEvent.change(screen.getByPlaceholderText('Buscar por código, marca o modelo...'), { target: { value: 'H' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })
    expect(mockSelectQuery).not.toHaveBeenCalled()
  })

  it('busca después de 300ms con 2+ caracteres', async () => {
    render(<MotoSearch />)
    await buscarMoto('Ho')
    expect(mockSelectQuery).toHaveBeenCalled()
  })

  it('muestra resultados con marca y modelo', async () => {
    render(<MotoSearch />)
    await buscarMoto()
    expect(screen.getByText(/Honda CB150 2023/)).toBeInTheDocument()
  })

  it('muestra el stock en los resultados', async () => {
    render(<MotoSearch />)
    await buscarMoto()
    expect(screen.getByText(/Stock: 3/)).toBeInTheDocument()
  })

  it('no muestra dropdown sin resultados', async () => {
    mockSelectQuery.mockResolvedValueOnce({ data: [], error: null })
    render(<MotoSearch />)
    await buscarMoto('xyz123')
    expect(screen.queryByText(/Honda/)).not.toBeInTheDocument()
  })
})

describe('MotoSearch — selección de moto', () => {
  it('agrega la moto al carrito al hacer clic', async () => {
    render(<MotoSearch />)
    await buscarMoto()
    fireEvent.click(screen.getByText(/Honda CB150 2023/).closest('button')!)
    const { items } = useMotoCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].moto_id).toBe('m1')
    expect(items[0].marca).toBe('Honda')
    expect(items[0].precio_unitario).toBe(8500)
  })

  it('limpia el input después de seleccionar', async () => {
    render(<MotoSearch />)
    const input = screen.getByPlaceholderText('Buscar por código, marca o modelo...')
    await buscarMoto()
    fireEvent.click(screen.getByText(/Honda CB150 2023/).closest('button')!)
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('no agrega la misma moto dos veces (sin duplicados)', async () => {
    render(<MotoSearch />)
    await buscarMoto()
    fireEvent.click(screen.getByText(/Honda CB150 2023/).closest('button')!)

    await buscarMoto()
    fireEvent.click(screen.getByText(/Honda CB150 2023/).closest('button')!)

    expect(useMotoCartStore.getState().items).toHaveLength(1)
  })

  it('asigna precio_venta como precio_unitario', async () => {
    render(<MotoSearch />)
    await buscarMoto()
    fireEvent.click(screen.getByText(/Honda CB150 2023/).closest('button')!)
    const item = useMotoCartStore.getState().items[0]
    expect(item.precio_unitario).toBe(mockMoto.precio_venta)
  })
})
