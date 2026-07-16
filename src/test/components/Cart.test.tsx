import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Cart } from '@/components/pos/Cart'
import { useCartStore } from '@/lib/store/cartStore'
import { useMotoCartStore } from '@/lib/store/motoCartStore'

vi.mock('@/components/pos/CartItem', () => ({
  CartItem: ({ item, mode }: { item: { nombre?: string; marca?: string; modelo?: string }; mode: string }) => (
    <div data-testid={`cart-item-${mode}`}>
      {mode === 'repuesto' ? item.nombre : `${item.marca} ${item.modelo}`}
    </div>
  ),
}))

beforeEach(() => {
  useCartStore.setState({ items: [] })
  useMotoCartStore.setState({ items: [] })
})

describe('Cart — modo repuesto', () => {
  it('muestra carrito vacío cuando no hay items', () => {
    render(<Cart mode="repuesto" />)
    expect(screen.getByText('Carrito vacío')).toBeInTheDocument()
  })

  it('muestra items cuando hay productos en el carrito', () => {
    useCartStore.setState({
      items: [{
        producto_id: 'p1',
        codigo: 'REP001',
        nombre: 'Llanta trasera',
        precio_unitario: 150,
        costo_unitario: 100,
        cantidad: 1,
        stock: 10,
      }],
    })
    render(<Cart mode="repuesto" />)
    expect(screen.getByTestId('cart-item-repuesto')).toBeInTheDocument()
  })

  it('muestra el total del carrito', () => {
    useCartStore.setState({
      items: [{
        producto_id: 'p1',
        codigo: 'REP001',
        nombre: 'Llanta',
        precio_unitario: 200,
        costo_unitario: 150,
        cantidad: 2,
        stock: 5,
      }],
    })
    render(<Cart mode="repuesto" />)
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('no muestra items de motos en modo repuesto', () => {
    useMotoCartStore.setState({
      items: [{
        moto_id: 'm1',
        codigo: 'MOT001',
        marca: 'Honda',
        modelo: 'CB150',
        anio: 2023,
        precio_unitario: 8500,
        cantidad: 1,
        stock: 2,
      }],
    })
    render(<Cart mode="repuesto" />)
    expect(screen.getByText('Carrito vacío')).toBeInTheDocument()
  })
})

describe('Cart — modo moto', () => {
  it('muestra carrito vacío cuando no hay motos', () => {
    render(<Cart mode="moto" />)
    expect(screen.getByText('Carrito vacío')).toBeInTheDocument()
  })

  it('muestra items de moto cuando existen', () => {
    useMotoCartStore.setState({
      items: [{
        moto_id: 'm1',
        codigo: 'MOT001',
        marca: 'Honda',
        modelo: 'CB150',
        anio: 2023,
        precio_unitario: 8500,
        cantidad: 1,
        stock: 2,
      }],
    })
    render(<Cart mode="moto" />)
    expect(screen.getByTestId('cart-item-moto')).toBeInTheDocument()
  })

  it('no muestra items de repuestos en modo moto', () => {
    useCartStore.setState({
      items: [{
        producto_id: 'p1',
        codigo: 'REP001',
        nombre: 'Filtro',
        precio_unitario: 50,
        costo_unitario: 30,
        cantidad: 1,
        stock: 5,
      }],
    })
    render(<Cart mode="moto" />)
    expect(screen.getByText('Carrito vacío')).toBeInTheDocument()
  })
})
