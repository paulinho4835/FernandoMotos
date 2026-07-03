import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '@/lib/store/cartStore'
import type { CartItemRepuesto } from '@/lib/types'

const baseItem: Omit<CartItemRepuesto, 'cantidad'> = {
  producto_id: 'prod-1',
  codigo: 'REP001',
  nombre: 'Llanta trasera',
  precio_unitario: 150,
  costo_unitario: 100,
  stock: 10,
}

beforeEach(() => {
  useCartStore.setState({ items: [] })
})

describe('cartStore — addItem', () => {
  it('agrega un item nuevo con cantidad 1', () => {
    useCartStore.getState().addItem(baseItem)
    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].cantidad).toBe(1)
    expect(items[0].producto_id).toBe('prod-1')
  })

  it('incrementa la cantidad si el item ya existe', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().addItem(baseItem)
    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].cantidad).toBe(2)
  })

  it('no supera el stock al incrementar', () => {
    const itemConStockLimitado = { ...baseItem, stock: 2 }
    useCartStore.getState().addItem(itemConStockLimitado)
    useCartStore.getState().addItem(itemConStockLimitado)
    useCartStore.getState().addItem(itemConStockLimitado)
    const { items } = useCartStore.getState()
    expect(items[0].cantidad).toBe(2)
  })

  it('agrega múltiples productos distintos', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().addItem({ ...baseItem, producto_id: 'prod-2', nombre: 'Filtro de aire' })
    expect(useCartStore.getState().items).toHaveLength(2)
  })
})

describe('cartStore — removeItem', () => {
  it('elimina el item por producto_id', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().removeItem('prod-1')
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('no falla si el id no existe', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().removeItem('no-existe')
    expect(useCartStore.getState().items).toHaveLength(1)
  })
})

describe('cartStore — updateQuantity', () => {
  it('actualiza la cantidad del item', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().updateQuantity('prod-1', 5)
    expect(useCartStore.getState().items[0].cantidad).toBe(5)
  })

  it('elimina el item si la cantidad es 0', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().updateQuantity('prod-1', 0)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('elimina el item si la cantidad es negativa', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().updateQuantity('prod-1', -1)
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

describe('cartStore — updatePrice', () => {
  it('actualiza el precio unitario del item', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().updatePrice('prod-1', 200)
    expect(useCartStore.getState().items[0].precio_unitario).toBe(200)
  })

  it('no modifica otros items', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().addItem({ ...baseItem, producto_id: 'prod-2', precio_unitario: 80 })
    useCartStore.getState().updatePrice('prod-1', 999)
    expect(useCartStore.getState().items.find(i => i.producto_id === 'prod-2')?.precio_unitario).toBe(80)
  })
})

describe('cartStore — clear', () => {
  it('vacía todos los items', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().addItem({ ...baseItem, producto_id: 'prod-2' })
    useCartStore.getState().clear()
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('clear en carrito vacío no falla', () => {
    expect(() => useCartStore.getState().clear()).not.toThrow()
  })
})

describe('cartStore — total', () => {
  it('retorna 0 con carrito vacío', () => {
    expect(useCartStore.getState().total()).toBe(0)
  })

  it('calcula total = precio_unitario * cantidad', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().updateQuantity('prod-1', 3)
    expect(useCartStore.getState().total()).toBe(150 * 3)
  })

  it('suma correctamente múltiples items', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().addItem({ ...baseItem, producto_id: 'prod-2', precio_unitario: 50 })
    expect(useCartStore.getState().total()).toBe(150 + 50)
  })
})

describe('cartStore — ganancia', () => {
  it('retorna 0 con carrito vacío', () => {
    expect(useCartStore.getState().ganancia()).toBe(0)
  })

  it('calcula ganancia = (precio - costo) * cantidad', () => {
    useCartStore.getState().addItem(baseItem) // precio 150, costo 100
    useCartStore.getState().updateQuantity('prod-1', 2)
    expect(useCartStore.getState().ganancia()).toBe((150 - 100) * 2)
  })

  it('suma ganancia de múltiples items', () => {
    useCartStore.getState().addItem(baseItem) // ganancia 50
    useCartStore.getState().addItem({ ...baseItem, producto_id: 'prod-2', precio_unitario: 200, costo_unitario: 120 })
    expect(useCartStore.getState().ganancia()).toBe(50 + 80)
  })

  it('ganancia puede ser negativa si precio < costo', () => {
    useCartStore.getState().addItem({ ...baseItem, precio_unitario: 80, costo_unitario: 100 })
    expect(useCartStore.getState().ganancia()).toBe(-20)
  })
})
