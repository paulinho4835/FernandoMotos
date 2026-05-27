import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from './cartStore'

const mockItem = {
  producto_id: 'p1',
  codigo: 'SKU-001',
  nombre: 'Filtro de aceite',
  precio_unitario: 50,
  costo_unitario: 30,
  stock: 10,
}

beforeEach(() => useCartStore.getState().clear())

describe('cartStore', () => {
  it('adds item with cantidad 1', () => {
    useCartStore.getState().addItem(mockItem)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].cantidad).toBe(1)
  })

  it('increments cantidad on duplicate add', () => {
    useCartStore.getState().addItem(mockItem)
    useCartStore.getState().addItem(mockItem)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].cantidad).toBe(2)
  })

  it('removes item', () => {
    useCartStore.getState().addItem(mockItem)
    useCartStore.getState().removeItem('p1')
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('calculates total', () => {
    useCartStore.getState().addItem(mockItem)
    expect(useCartStore.getState().total()).toBe(50)
  })

  it('calculates ganancia', () => {
    useCartStore.getState().addItem(mockItem)
    expect(useCartStore.getState().ganancia()).toBe(20)
  })

  it('clears cart', () => {
    useCartStore.getState().addItem(mockItem)
    useCartStore.getState().clear()
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})
