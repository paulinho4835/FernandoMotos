import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CartItem } from '@/components/pos/CartItem'
import { useCartStore } from '@/lib/store/cartStore'
import { useMotoCartStore } from '@/lib/store/motoCartStore'
import type { CartItemRepuesto, CartItemMoto } from '@/lib/types'

const repuestoItem: CartItemRepuesto = {
  producto_id: 'p1',
  codigo: 'REP001',
  nombre: 'Llanta trasera',
  precio_unitario: 150,
  costo_unitario: 100,
  cantidad: 2,
  stock: 10,
}

const motoItem: CartItemMoto = {
  moto_id: 'm1',
  codigo: 'MOT001',
  marca: 'Honda',
  modelo: 'CB150',
  anio: 2023,
  precio_unitario: 8500,
  cantidad: 1,
  stock: 3,
}

beforeEach(() => {
  useCartStore.setState({ items: [repuestoItem] })
  useMotoCartStore.setState({ items: [motoItem] })
})

describe('CartItem — modo repuesto', () => {
  it('muestra el nombre del producto', () => {
    render(<CartItem item={repuestoItem} mode="repuesto" />)
    expect(screen.getByText('Llanta trasera')).toBeInTheDocument()
  })

  it('muestra el subtotal calculado', () => {
    render(<CartItem item={repuestoItem} mode="repuesto" />)
    // subtotal = 150 * 2 = 300 => Bs. 300,00
    expect(screen.getByText(/300/)).toBeInTheDocument()
  })

  it('elimina el item al hacer clic en el botón de eliminar', () => {
    const removeItem = vi.spyOn(useCartStore.getState(), 'removeItem')
    render(<CartItem item={repuestoItem} mode="repuesto" />)
    const buttons = screen.getAllByRole('button')
    const deleteBtn = buttons.find(b => b.querySelector('svg'))
    fireEvent.click(deleteBtn!)
    expect(removeItem).toHaveBeenCalledWith('p1')
  })

  it('tiene input de precio editable', () => {
    render(<CartItem item={repuestoItem} mode="repuesto" />)
    const inputs = screen.getAllByRole('spinbutton')
    const precioInput = inputs[0]
    expect(precioInput).toHaveValue(150)
  })

  it('tiene input de cantidad editable', () => {
    render(<CartItem item={repuestoItem} mode="repuesto" />)
    const inputs = screen.getAllByRole('spinbutton')
    const cantidadInput = inputs[1]
    expect(cantidadInput).toHaveValue(2)
  })
})

describe('CartItem — modo moto', () => {
  it('muestra marca, modelo y año', () => {
    render(<CartItem item={motoItem} mode="moto" />)
    expect(screen.getByText(/Honda CB150 2023/)).toBeInTheDocument()
  })

  it('muestra el código de la moto', () => {
    render(<CartItem item={motoItem} mode="moto" />)
    expect(screen.getByText('MOT001')).toBeInTheDocument()
  })

  it('muestra el precio formateado', () => {
    render(<CartItem item={motoItem} mode="moto" />)
    expect(screen.getByText(/8\.500|8,500|8500/)).toBeInTheDocument()
  })

  it('elimina la moto al hacer clic en el botón de eliminar', () => {
    const removeItem = vi.spyOn(useMotoCartStore.getState(), 'removeItem')
    render(<CartItem item={motoItem} mode="moto" />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(removeItem).toHaveBeenCalledWith('m1')
  })
})
