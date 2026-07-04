import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseToolArgs, executeTool } from '@/lib/agent/tools'
import * as queries from '@/lib/agent/queries'

vi.mock('@/lib/agent/queries')

const supa = {} as never

beforeEach(() => vi.resetAllMocks())

describe('parseToolArgs', () => {
  it('parsea string JSON', () => {
    expect(parseToolArgs('{"a":1}')).toEqual({ a: 1 })
  })
  // Reproduce el bug de Vapi: arguments llega como OBJETO, no string.
  it('acepta objeto directo', () => {
    expect(parseToolArgs({ a: 1 })).toEqual({ a: 1 })
  })
  it('devuelve {} ante basura', () => {
    expect(parseToolArgs('no-json')).toEqual({})
    expect(parseToolArgs(null)).toEqual({})
  })
})

describe('executeTool crear_pedido', () => {
  it('ERROR si falta cliente_nombre', async () => {
    const r = await executeTool(supa, 'crear_pedido', { moto_id: 'x' }, { telefono: '591700' })
    expect(r).toMatch(/^ERROR:/)
    expect(queries.crearPedido).not.toHaveBeenCalled()
  })

  it('crea el pedido y usa el telefono del contexto por defecto', async () => {
    vi.mocked(queries.detalleMoto).mockResolvedValue({ id: 'm1', disponible: 2 } as never)
    vi.mocked(queries.crearPedido).mockResolvedValue({ id: 'ped1' })
    const r = await executeTool(
      supa, 'crear_pedido',
      { moto_id: 'm1', cliente_nombre: 'Juan' },
      { telefono: '591700' },
    )
    expect(queries.crearPedido).toHaveBeenCalledWith(
      supa,
      expect.objectContaining({ moto_id: 'm1', cliente_nombre: 'Juan', cliente_telefono: '591700' }),
    )
    expect(r).toContain('ped1')
    expect(r).not.toMatch(/^ERROR:/)
  })

  it('ERROR si la moto no tiene disponibilidad', async () => {
    vi.mocked(queries.detalleMoto).mockResolvedValue({ id: 'm1', disponible: 0 } as never)
    const r = await executeTool(
      supa, 'crear_pedido',
      { moto_id: 'm1', cliente_nombre: 'Juan' },
      { telefono: '591700' },
    )
    expect(r).toMatch(/^ERROR:/)
    expect(queries.crearPedido).not.toHaveBeenCalled()
  })
})

describe('executeTool buscar_motos', () => {
  it('devuelve JSON de resultados', async () => {
    vi.mocked(queries.buscarMotos).mockResolvedValue([
      { id: 'm1', marca: 'Honda', modelo: 'XR150', anio: 2024, color: 'rojo', motor_cc: 150, precio_venta: 12000, disponible: 1 },
    ])
    const r = await executeTool(supa, 'buscar_motos', { query: 'honda' }, { telefono: '591700' })
    expect(r).toContain('Honda')
    expect(r).toContain('XR150')
  })

  it('mensaje claro si no hay resultados', async () => {
    vi.mocked(queries.buscarMotos).mockResolvedValue([])
    const r = await executeTool(supa, 'buscar_motos', { query: 'zzz' }, { telefono: '591700' })
    expect(r.toLowerCase()).toContain('no se encontr')
  })
})
