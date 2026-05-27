import { describe, it, expect } from 'vitest'
import { formatBOB } from './formatCurrency'

describe('formatBOB', () => {
  it('formats zero', () => {
    expect(formatBOB(0)).toBe('Bs. 0,00')
  })
  it('formats whole number', () => {
    expect(formatBOB(1500)).toBe('Bs. 1.500,00')
  })
  it('formats decimal', () => {
    expect(formatBOB(99.5)).toBe('Bs. 99,50')
  })
})
