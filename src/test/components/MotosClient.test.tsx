import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MotosClient } from '@/components/inventario/MotosClient'
import type { Moto } from '@/lib/types'

vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))
vi.mock('@/components/pos/CheckoutModal', () => ({ CheckoutModal: () => null }))

const motos = [
  {
    id: 'm1', codigo: 'CH1', marca: 'Honda', modelo: 'XR150', color: 'Rojo', anio: 2024,
    motor_cc: 150, numero_motor: 'MT1', numero_chasis: 'CH1', precio_venta: 12000,
    stock: 1, stock_minimo: 0, ubicacion: 'Depósito A', descripcion: null, activo: true,
    fotos: [], created_at: '', updated_at: '',
  },
  {
    id: 'm2', codigo: 'CH2', marca: 'Yamaha', modelo: 'FZ250', color: 'Negro', anio: 2023,
    motor_cc: 250, numero_motor: 'MT2', numero_chasis: 'CH2', precio_venta: 15000,
    stock: 1, stock_minimo: 0, ubicacion: 'Depósito B', descripcion: null, activo: true,
    fotos: [], created_at: '', updated_at: '',
  },
] as unknown as Moto[]

const baseProps = {
  isAdmin: false,
  vendedorId: 'v1',
  vendedorNombre: 'Vendedor',
  negocioNombre: 'Negocio',
  negocioDireccion: '',
  negocioTelefono: '',
}

describe('MotosClient - filtro de búsqueda', () => {
  it('muestra todas las motos sin texto de búsqueda', () => {
    render(<MotosClient motos={motos} {...baseProps} />)
    expect(screen.getByText('XR150')).toBeInTheDocument()
    expect(screen.getByText('FZ250')).toBeInTheDocument()
  })

  it('filtra por Tipo/CC insensible a mayúsculas', () => {
    render(<MotosClient motos={motos} {...baseProps} />)
    const input = screen.getByPlaceholderText('Buscar por Tipo/CC...')
    fireEvent.change(input, { target: { value: 'xr1' } })
    expect(screen.getByText('XR150')).toBeInTheDocument()
    expect(screen.queryByText('FZ250')).not.toBeInTheDocument()
  })
})
