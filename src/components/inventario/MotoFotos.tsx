'use client'
import { useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import { ImagePlus, X, Loader2 } from 'lucide-react'

interface Props {
  motoId: string
  fotos: string[]
  onChange: (fotos: string[]) => void
}

export function MotoFotos({ motoId, fotos, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.set('motoId', motoId)
    for (const file of Array.from(files)) formData.append('file', file)

    try {
      const res = await fetch('/api/motos/fotos', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al subir las fotos')
      } else {
        if (data.errors) setError(data.errors.join('; '))
        if (data.urls?.length > 0) onChange([...fotos, ...data.urls])
      }
    } catch {
      setError('Error de red al subir las fotos')
    }

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(url: string) {
    if (!confirm('¿Eliminar esta foto?')) return
    setDeletingUrl(url)
    setError('')
    try {
      const res = await fetch('/api/motos/fotos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo eliminar')
      } else {
        onChange(fotos.filter(f => f !== url))
      }
    } catch {
      setError('Error de red al eliminar la foto')
    }
    setDeletingUrl(null)
  }

  return (
    <div className="space-y-2">
      <Label>Fotos <span className="text-xs text-slate-400">(opcional)</span></Label>
      <div className="flex flex-wrap gap-2">
        {fotos.map(url => (
          <div key={url} className="relative w-20 h-20 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Foto de la moto" className="w-20 h-20 rounded-md object-cover border" />
            <button
              type="button"
              onClick={() => handleDelete(url)}
              disabled={deletingUrl === url}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
              title="Eliminar foto"
            >
              {deletingUrl === url ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-20 h-20 rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          <span className="text-[10px]">{uploading ? 'Subiendo...' : 'Agregar'}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
