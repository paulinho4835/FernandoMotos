import { describe, it, expect } from 'vitest'
import { esAdmin, esSuperAdmin } from './roles'

describe('esAdmin', () => {
  it('es true para admin y super_admin', () => {
    expect(esAdmin('admin')).toBe(true)
    expect(esAdmin('super_admin')).toBe(true)
  })
  it('es false para vendedor, null o undefined', () => {
    expect(esAdmin('vendedor')).toBe(false)
    expect(esAdmin(null)).toBe(false)
    expect(esAdmin(undefined)).toBe(false)
  })
})

describe('esSuperAdmin', () => {
  it('es true solo para super_admin', () => {
    expect(esSuperAdmin('super_admin')).toBe(true)
    expect(esSuperAdmin('admin')).toBe(false)
    expect(esSuperAdmin('vendedor')).toBe(false)
    expect(esSuperAdmin(null)).toBe(false)
  })
})
