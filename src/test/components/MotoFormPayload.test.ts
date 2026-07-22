import { describe, it, expect } from 'vitest'
import { buildMotoPayload } from '@/components/inventario/MotoForm'

const form = {
  marca: 'Honda', modelo: 'XR150', color: 'Rojo', anio: '2024',
  numero_chasis: 'CH123', numero_motor: 'MT456', motor_cc: '150',
  ubicacion: 'Depósito A', proveedor: 'Importadora XYZ', costo: '8000', precio_venta: '12000',
}

describe('buildMotoPayload', () => {
  it('arma motoData sin costo, con ubicacion y descripcion null', () => {
    const { motoData } = buildMotoPayload(form)
    expect(motoData).not.toHaveProperty('costo')
    expect(motoData).not.toHaveProperty('stock')
    expect(motoData.ubicacion).toBe('Depósito A')
    expect(motoData.proveedor).toBe('Importadora XYZ')
    expect(motoData.descripcion).toBeNull()
    expect(motoData.codigo).toBe('CH123')
    expect(motoData.precio_venta).toBe(12000)
    expect(motoData.motor_cc).toBe(150)
  })

  it('extrae el costo por separado como número', () => {
    const { costo } = buildMotoPayload(form)
    expect(costo).toBe(8000)
  })
})
