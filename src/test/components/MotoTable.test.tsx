import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MotoTable } from '@/components/inventario/MotoTable'
import type { Moto } from '@/lib/types'

vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }))

const moto = {
  id: 'm1', codigo: 'CH1', marca: 'Honda', modelo: 'XR150', color: 'Rojo', anio: 2024,
  motor_cc: 150, numero_motor: 'MT1', numero_chasis: 'CH1', precio_venta: 12000,
  stock: 1, stock_minimo: 0, ubicacion: 'Depósito A', descripcion: null, activo: true,
  fotos: [], created_at: '', updated_at: '',
} as unknown as Moto

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
})
