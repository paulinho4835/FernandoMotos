import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MotoFotos } from '@/components/inventario/MotoFotos'

function file(name: string) {
  return new File(['contenido'], name, { type: 'image/png' })
}

beforeEach(() => {
  vi.stubGlobal('confirm', vi.fn(() => true))
})

describe('MotoFotos', () => {
  it('sube archivos vía POST a /api/motos/fotos y llama onChange con las URLs nuevas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ urls: ['https://r2.example.com/m1/foto1.png'] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const onChange = vi.fn()

    const { container } = render(<MotoFotos motoId="m1" fotos={[]} onChange={onChange} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file('foto1.png')] } })

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['https://r2.example.com/m1/foto1.png']))

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/motos/fotos')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('motoId')).toBe('m1')
  })

  it('muestra el error del servidor si la subida falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'ERROR: bucket no configurado' }),
    }))
    const onChange = vi.fn()

    const { container } = render(<MotoFotos motoId="m1" fotos={[]} onChange={onChange} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file('foto1.png')] } })

    expect(await screen.findByText('ERROR: bucket no configurado')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('elimina una foto vía DELETE y llama onChange sin ella', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    vi.stubGlobal('fetch', fetchMock)
    const onChange = vi.fn()

    render(<MotoFotos motoId="m1" fotos={['https://r2.example.com/m1/foto1.png']} onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Eliminar foto'))

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([]))

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/motos/fotos')
    expect(options.method).toBe('DELETE')
    expect(JSON.parse(options.body)).toEqual({ url: 'https://r2.example.com/m1/foto1.png' })
  })
})
