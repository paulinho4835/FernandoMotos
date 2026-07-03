import { describe, it, expect } from 'vitest'
import { formatBOB } from '@/lib/utils/formatCurrency'

describe('formatBOB', () => {
  it('prefija con "Bs. "', () => {
    expect(formatBOB(100)).toMatch(/^Bs\. /)
  })

  it('formatea número entero con dos decimales', () => {
    expect(formatBOB(100)).toBe('Bs. 100,00')
  })

  it('formatea número con decimales', () => {
    expect(formatBOB(99.5)).toBe('Bs. 99,50')
  })

  it('formatea cero', () => {
    expect(formatBOB(0)).toBe('Bs. 0,00')
  })

  it('formatea número negativo', () => {
    const result = formatBOB(-50)
    expect(result).toMatch(/^Bs\. -/)
  })

  it('formatea número grande con separador de miles', () => {
    const result = formatBOB(1000)
    expect(result).toContain('1')
    expect(result).toMatch(/Bs\. /)
  })

  it('formatea número con muchos decimales redondeando a 2', () => {
    expect(formatBOB(10.999)).toBe('Bs. 11,00')
  })

  it('formatea número con exactamente 2 decimales sin cambio', () => {
    expect(formatBOB(25.75)).toBe('Bs. 25,75')
  })
})
