import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LowStockAlert } from '@/components/dashboard/LowStockAlert'

describe('LowStockAlert', () => {
  it('lista solo repuestos con stock bajo', () => {
    render(<LowStockAlert productos={[
      { id: 'p1', nombre: 'Filtro', codigo: 'F1', stock: 1, stock_minimo: 5 },
    ]} />)
    expect(screen.getByText('Filtro')).toBeInTheDocument()
    expect(screen.getByText(/Repuesto/)).toBeInTheDocument()
  })

  it('muestra mensaje vacío sin repuestos', () => {
    render(<LowStockAlert productos={[]} />)
    expect(screen.getByText(/Sin alertas de stock/i)).toBeInTheDocument()
  })
})
