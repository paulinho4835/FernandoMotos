import { describe, it, expect, beforeEach } from 'vitest'
import { useMotoCartStore } from '@/lib/store/motoCartStore'
import type { CartItemMoto } from '@/lib/types'

const baseMoto: Omit<CartItemMoto, 'cantidad'> = {
  moto_id: 'moto-1',
  codigo: 'MOT001',
  marca: 'Honda',
  modelo: 'CB150',
  anio: 2023,
  precio_unitario: 8500,
  stock: 3,
}

beforeEach(() => {
  useMotoCartStore.setState({ items: [] })
})

describe('motoCartStore — addItem', () => {
  it('agrega una moto nueva con cantidad 1', () => {
    useMotoCartStore.getState().addItem(baseMoto)
    const { items } = useMotoCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].cantidad).toBe(1)
    expect(items[0].moto_id).toBe('moto-1')
  })

  it('no agrega duplicados (misma moto_id)', () => {
    useMotoCartStore.getState().addItem(baseMoto)
    useMotoCartStore.getState().addItem(baseMoto)
    expect(useMotoCartStore.getState().items).toHaveLength(1)
  })

  it('agrega dos motos distintas', () => {
    useMotoCartStore.getState().addItem(baseMoto)
    useMotoCartStore.getState().addItem({ ...baseMoto, moto_id: 'moto-2', modelo: 'XR250' })
    expect(useMotoCartStore.getState().items).toHaveLength(2)
  })

  it('conserva todos los campos al agregar', () => {
    useMotoCartStore.getState().addItem(baseMoto)
    const item = useMotoCartStore.getState().items[0]
    expect(item.marca).toBe('Honda')
    expect(item.modelo).toBe('CB150')
    expect(item.anio).toBe(2023)
    expect(item.precio_unitario).toBe(8500)
  })

  it('acepta anio null', () => {
    useMotoCartStore.getState().addItem({ ...baseMoto, anio: null })
    expect(useMotoCartStore.getState().items[0].anio).toBeNull()
  })
})

describe('motoCartStore — removeItem', () => {
  it('elimina la moto por moto_id', () => {
    useMotoCartStore.getState().addItem(baseMoto)
    useMotoCartStore.getState().removeItem('moto-1')
    expect(useMotoCartStore.getState().items).toHaveLength(0)
  })

  it('no falla si el id no existe', () => {
    useMotoCartStore.getState().addItem(baseMoto)
    useMotoCartStore.getState().removeItem('no-existe')
    expect(useMotoCartStore.getState().items).toHaveLength(1)
  })

  it('solo elimina la moto indicada, no las demás', () => {
    useMotoCartStore.getState().addItem(baseMoto)
    useMotoCartStore.getState().addItem({ ...baseMoto, moto_id: 'moto-2' })
    useMotoCartStore.getState().removeItem('moto-1')
    expect(useMotoCartStore.getState().items).toHaveLength(1)
    expect(useMotoCartStore.getState().items[0].moto_id).toBe('moto-2')
  })
})

describe('motoCartStore — clear', () => {
  it('vacía todos los items', () => {
    useMotoCartStore.getState().addItem(baseMoto)
    useMotoCartStore.getState().addItem({ ...baseMoto, moto_id: 'moto-2' })
    useMotoCartStore.getState().clear()
    expect(useMotoCartStore.getState().items).toHaveLength(0)
  })

  it('clear en carrito vacío no falla', () => {
    expect(() => useMotoCartStore.getState().clear()).not.toThrow()
  })
})

describe('motoCartStore — total', () => {
  it('retorna 0 con carrito vacío', () => {
    expect(useMotoCartStore.getState().total()).toBe(0)
  })

  it('retorna el precio_unitario de una sola moto', () => {
    useMotoCartStore.getState().addItem(baseMoto)
    expect(useMotoCartStore.getState().total()).toBe(8500)
  })

  it('suma precios de múltiples motos', () => {
    useMotoCartStore.getState().addItem(baseMoto)
    useMotoCartStore.getState().addItem({ ...baseMoto, moto_id: 'moto-2', precio_unitario: 12000 })
    expect(useMotoCartStore.getState().total()).toBe(8500 + 12000)
  })
})
