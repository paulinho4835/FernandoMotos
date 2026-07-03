import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ProductSearch } from '@/components/pos/ProductSearch'
import { useCartStore } from '@/lib/store/cartStore'
import type { Producto } from '@/lib/types'

const mockProducto: Producto = {
  id: 'p1',
  codigo: 'REP001',
  nombre: 'Llanta trasera 275-17',
  descripcion: null,
  costo: 100,
  precio_venta: 150,
  precio_referencial: 160,
  medida: '2.75',
  stock: 5,
  stock_minimo: 2,
  ubicacion: 'A1',
  compatibilidad: [],
  categoria_id: null,
  activo: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
}

const mockSelectQuery = vi.fn()
const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: mockSelectQuery,
}
const mockFrom = vi.fn(() => mockChain)

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

beforeEach(() => {
  useCartStore.setState({ items: [] })
  vi.useFakeTimers()
  mockSelectQuery.mockResolvedValue({ data: [mockProducto], error: null })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('ProductSearch — renderizado', () => {
  it('muestra el input de búsqueda', () => {
    render(<ProductSearch />)
    expect(screen.getByPlaceholderText('Buscar por código o nombre...')).toBeInTheDocument()
  })

  it('no muestra resultados al inicio', () => {
    render(<ProductSearch />)
    expect(screen.queryByText('Llanta trasera 275-17')).not.toBeInTheDocument()
  })
})

describe('ProductSearch — búsqueda', () => {
  it('no busca con menos de 2 caracteres', async () => {
    render(<ProductSearch />)
    fireEvent.change(screen.getByPlaceholderText('Buscar por código o nombre...'), { target: { value: 'L' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })
    expect(mockSelectQuery).not.toHaveBeenCalled()
  })

  it('busca después de 300ms con 2+ caracteres', async () => {
    render(<ProductSearch />)
    fireEvent.change(screen.getByPlaceholderText('Buscar por código o nombre...'), { target: { value: 'LL' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(350) })
    expect(mockSelectQuery).toHaveBeenCalled()
  })

  it('muestra resultados en el dropdown', async () => {
    render(<ProductSearch />)
    fireEvent.change(screen.getByPlaceholderText('Buscar por código o nombre...'), { target: { value: 'Llanta' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(350) })
    expect(screen.getByText('Llanta trasera 275-17')).toBeInTheDocument()
  })

  it('muestra el stock del producto en resultados', async () => {
    render(<ProductSearch />)
    fireEvent.change(screen.getByPlaceholderText('Buscar por código o nombre...'), { target: { value: 'Llanta' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(350) })
    expect(screen.getByText(/Stock: 5/)).toBeInTheDocument()
  })

  it('no muestra dropdown si no hay resultados', async () => {
    mockSelectQuery.mockResolvedValueOnce({ data: [], error: null })
    render(<ProductSearch />)
    fireEvent.change(screen.getByPlaceholderText('Buscar por código o nombre...'), { target: { value: 'xyz' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(350) })
    expect(screen.queryByText('Llanta trasera 275-17')).not.toBeInTheDocument()
  })
})

describe('ProductSearch — selección de producto', () => {
  async function buscarYMostrar() {
    fireEvent.change(screen.getByPlaceholderText('Buscar por código o nombre...'), { target: { value: 'Llanta' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(350) })
  }

  it('muestra el panel de confirmación al seleccionar un producto', async () => {
    render(<ProductSearch />)
    await buscarYMostrar()
    fireEvent.click(screen.getByText('Llanta trasera 275-17').closest('button')!)
    expect(screen.getByText('Precio de venta (Bs.)')).toBeInTheDocument()
  })

  it('pre-llena el precio con el precio_referencial', async () => {
    render(<ProductSearch />)
    await buscarYMostrar()
    fireEvent.click(screen.getByText('Llanta trasera 275-17').closest('button')!)
    const precioInput = screen.getByPlaceholderText(/Referencial/)
    expect((precioInput as HTMLInputElement).value).toBe('160')
  })

  it('agrega el item al carrito al confirmar con precio válido', async () => {
    render(<ProductSearch />)
    await buscarYMostrar()
    fireEvent.click(screen.getByText('Llanta trasera 275-17').closest('button')!)
    fireEvent.click(screen.getByRole('button', { name: /Agregar/ }))
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].producto_id).toBe('p1')
    expect(useCartStore.getState().items[0].precio_unitario).toBe(160)
  })

  it('no agrega si precio es 0', async () => {
    render(<ProductSearch />)
    await buscarYMostrar()
    fireEvent.click(screen.getByText('Llanta trasera 275-17').closest('button')!)
    const precioInput = screen.getByPlaceholderText(/Referencial/)
    fireEvent.change(precioInput, { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /Agregar/ }))
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('cierra el panel al presionar Escape', async () => {
    render(<ProductSearch />)
    await buscarYMostrar()
    fireEvent.click(screen.getByText('Llanta trasera 275-17').closest('button')!)
    expect(screen.getByText('Precio de venta (Bs.)')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByPlaceholderText(/Referencial/), { key: 'Escape' })
    expect(screen.queryByText('Precio de venta (Bs.)')).not.toBeInTheDocument()
  })

  it('agrega al carrito con Enter en el campo precio', async () => {
    render(<ProductSearch />)
    await buscarYMostrar()
    fireEvent.click(screen.getByText('Llanta trasera 275-17').closest('button')!)
    fireEvent.keyDown(screen.getByPlaceholderText(/Referencial/), { key: 'Enter' })
    expect(useCartStore.getState().items).toHaveLength(1)
  })
})
