import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistorialClient } from '@/components/historial/HistorialClient'
import type { Venta } from '@/lib/types'

vi.mock('@/components/historial/SalesTable', () => ({
  SalesTable: ({ ventas }: { ventas: Venta[] }) => (
    <div data-testid="sales-table">
      {ventas.map(v => (
        <div key={v.id} data-testid={`venta-${v.id}`}>{v.id}</div>
      ))}
    </div>
  ),
}))

// Fijar fecha actual en UTC para pruebas deterministas
// Bolivia es UTC-4 => "hoy" en BOT = ahora - 4h
const FIXED_NOW = new Date('2025-06-08T12:00:00Z').getTime() // => BOT: 2025-06-08
beforeAll(() => { vi.setSystemTime(FIXED_NOW) })
afterAll(() => { vi.useRealTimers() })

function makeVenta(id: string, tipo: 'repuesto' | 'moto', createdAt: string, total = 100, ganancia = 20): Venta {
  return {
    id,
    vendedor_id: 'v1',
    cliente_id: null,
    tipo_venta: tipo,
    total,
    ganancia_neta: ganancia,
    metodo_pago: 'efectivo',
    estado: 'completada',
    notas: null,
    created_at: createdAt,
  }
}

const ventasHoy: Venta[] = [
  makeVenta('v1', 'repuesto', '2025-06-08T14:00:00Z', 200, 50),
  makeVenta('v2', 'moto', '2025-06-08T15:00:00Z', 8500, 1500),
  makeVenta('v3', 'repuesto', '2025-06-08T16:00:00Z', 100, 30),
]

const ventasAyer: Venta[] = [
  makeVenta('v4', 'repuesto', '2025-06-07T10:00:00Z', 300, 80),
]

const todasLasVentas = [...ventasHoy, ...ventasAyer]

describe('HistorialClient — renderizado básico', () => {
  it('muestra el filtro de fecha', () => {
    render(<HistorialClient ventas={[]} isAdmin={false} />)
    expect(screen.getAllByDisplayValue('2025-06-08')).toHaveLength(2)
  })

  it('muestra los botones de acceso rápido', () => {
    render(<HistorialClient ventas={[]} isAdmin={false} />)
    expect(screen.getByRole('button', { name: 'Hoy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ayer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Antes de ayer' })).toBeInTheDocument()
  })
})

describe('HistorialClient — resumen del día', () => {
  it('muestra el número de ventas del día', () => {
    render(<HistorialClient ventas={ventasHoy} isAdmin={false} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('muestra el total del día', () => {
    render(<HistorialClient ventas={ventasHoy} isAdmin={false} />)
    // total = 200 + 8500 + 100 = 8800 => "Bs. 8.800,00" o similar
    expect(screen.getByText(/8\.800|8,800/)).toBeInTheDocument()
  })

  it('muestra ganancia solo para admins', () => {
    const { rerender } = render(<HistorialClient ventas={ventasHoy} isAdmin={false} />)
    expect(screen.queryByText(/Ganancia/i)).not.toBeInTheDocument()
    rerender(<HistorialClient ventas={ventasHoy} isAdmin={true} />)
    expect(screen.getByText(/Ganancia/i)).toBeInTheDocument()
  })

  it('muestra 0 ventas cuando no hay datos', () => {
    render(<HistorialClient ventas={[]} isAdmin={false} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})

describe('HistorialClient — filtro por fecha', () => {
  it('muestra solo ventas de hoy por defecto', () => {
    render(<HistorialClient ventas={todasLasVentas} isAdmin={false} />)
    // 3 ventas de hoy en el tab Total
    expect(screen.getByText(/Total \(3\)/)).toBeInTheDocument()
  })

  it('filtra ventas al cambiar de fecha', () => {
    render(<HistorialClient ventas={todasLasVentas} isAdmin={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ayer' }))
    expect(screen.getByText(/Total \(1\)/)).toBeInTheDocument()
  })

  it('muestra 0 si no hay ventas en la fecha seleccionada', () => {
    render(<HistorialClient ventas={todasLasVentas} isAdmin={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Antes de ayer' }))
    expect(screen.getByText(/Total \(0\)/)).toBeInTheDocument()
  })
})

describe('HistorialClient — tabs por tipo', () => {
  it('muestra tabs de Total, Repuestos y Motos', () => {
    render(<HistorialClient ventas={ventasHoy} isAdmin={false} />)
    expect(screen.getByText(/Total \(3\)/)).toBeInTheDocument()
    expect(screen.getByText(/Repuestos \(2\)/)).toBeInTheDocument()
    expect(screen.getByText(/Motos \(1\)/)).toBeInTheDocument()
  })

  it('tab repuestos muestra solo ventas de repuestos', async () => {
    const user = userEvent.setup()
    render(<HistorialClient ventas={ventasHoy} isAdmin={false} />)
    await user.click(screen.getByRole('tab', { name: /Repuestos/ }))
    const panels = screen.getAllByRole('tabpanel', { hidden: true })
    const active = panels.find(p => p.getAttribute('data-state') === 'active')
    expect(active).toBeDefined()
    expect(active!.querySelector('[data-testid="venta-v1"]')).not.toBeNull()
    expect(active!.querySelector('[data-testid="venta-v3"]')).not.toBeNull()
    expect(active!.querySelector('[data-testid="venta-v2"]')).toBeNull()
  })

  it('tab motos muestra solo ventas de motos', async () => {
    const user = userEvent.setup()
    render(<HistorialClient ventas={ventasHoy} isAdmin={false} />)
    await user.click(screen.getByRole('tab', { name: /Motos/ }))
    const panels = screen.getAllByRole('tabpanel', { hidden: true })
    const active = panels.find(p => p.getAttribute('data-state') === 'active')
    expect(active).toBeDefined()
    expect(active!.querySelector('[data-testid="venta-v2"]')).not.toBeNull()
    expect(active!.querySelector('[data-testid="venta-v1"]')).toBeNull()
  })
})
