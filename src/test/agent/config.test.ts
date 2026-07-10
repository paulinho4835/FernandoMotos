import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AgentContext, ToolContext } from '@paulo/agent-core'
import { buildAgentConfig } from '@/lib/agent/config'
import * as queries from '@/lib/agent/queries'

vi.mock('@/lib/agent/queries')

const supa = {} as never

function ctx(telefono = '591700'): ToolContext {
  const agent: AgentContext = { handoffRequested: false, actionAttempted: false, actionSucceeded: false }
  return { telefono, meta: {}, agent }
}

function getTool(name: string) {
  const tool = buildAgentConfig(supa).tools.find((t) => t.name === name)
  if (!tool) throw new Error(`tool ${name} no encontrada`)
  return tool
}

beforeEach(() => vi.resetAllMocks())

describe('crear_pedido', () => {
  it('ERROR si falta cliente_nombre', async () => {
    const r = await getTool('crear_pedido').execute({ moto_id: 'x' }, ctx())
    expect(r).toMatch(/^ERROR:/)
    expect(queries.crearPedido).not.toHaveBeenCalled()
  })

  it('crea el pedido y usa el telefono del contexto por defecto', async () => {
    vi.mocked(queries.detalleMoto).mockResolvedValue({ id: 'm1', disponible: 2 } as never)
    vi.mocked(queries.crearPedido).mockResolvedValue({ id: 'ped1' })
    const r = await getTool('crear_pedido').execute({ moto_id: 'm1', cliente_nombre: 'Juan' }, ctx())
    expect(queries.crearPedido).toHaveBeenCalledWith(
      supa,
      expect.objectContaining({ moto_id: 'm1', cliente_nombre: 'Juan', cliente_telefono: '591700' }),
    )
    expect(r).toContain('ped1')
    expect(r).toMatch(/^OK:/)
  })

  it('ERROR si la moto no tiene disponibilidad', async () => {
    vi.mocked(queries.detalleMoto).mockResolvedValue({ id: 'm1', disponible: 0 } as never)
    const r = await getTool('crear_pedido').execute({ moto_id: 'm1', cliente_nombre: 'Juan' }, ctx())
    expect(r).toMatch(/^ERROR:/)
    expect(queries.crearPedido).not.toHaveBeenCalled()
  })
})

describe('buscar_motos', () => {
  it('devuelve JSON de resultados', async () => {
    vi.mocked(queries.buscarMotos).mockResolvedValue([
      { id: 'm1', marca: 'Honda', modelo: 'XR150', anio: 2024, color: 'rojo', motor_cc: 150, precio_venta: 12000, disponible: 1 },
    ])
    const r = await getTool('buscar_motos').execute({ query: 'honda' }, ctx())
    expect(r).toContain('Honda')
    expect(r).toContain('XR150')
  })

  it('mensaje claro si no hay resultados', async () => {
    vi.mocked(queries.buscarMotos).mockResolvedValue([])
    const r = await getTool('buscar_motos').execute({ query: 'zzz' }, ctx())
    expect(r.toLowerCase()).toContain('no se encontr')
  })
})

describe('hablar_con_humano', () => {
  it('marca handoffRequested en el contexto', async () => {
    const c = ctx()
    const r = await getTool('hablar_con_humano').execute({}, c)
    expect(c.agent.handoffRequested).toBe(true)
    expect(r).toMatch(/^OK:/)
  })
})
