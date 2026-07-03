'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Label } from '@/components/ui/label'
import { ImagePlus, X, Loader2 } from 'lucide-react'

interface Props {
  motoId: string
  fotos: string[]
  onChange: (fotos: string[]) => void
}

function pathFromUrl(url: string): string | null {
  const marker = '/object/public/motos/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
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
    const supabase = createClient()
    const nuevas: string[] = []

    for (const file of Array.from(files)) {
      const path = `${motoId}/${crypto.randomUUID()}-${file.name}`
      const { error: uploadErr } = await supabase.storage.from('motos').upload(path, file)
      if (uploadErr) {
        setError(`Error al subir ${file.name}: ${uploadErr.message}`)
        continue
      }
      const { data } = supabase.storage.from('motos').getPublicUrl(path)
      nuevas.push(data.publicUrl)
    }

    if (nuevas.length > 0) {
      const actualizadas = [...fotos, ...nuevas]
      const { error: updateErr } = await supabase
        .from('motos')
        .update({ fotos: actualizadas, updated_at: new Date().toISOString() })
        .eq('id', motoId)
      if (updateErr) {
        setError(`Las fotos se subieron pero no se guardó la referencia: ${updateErr.message}`)
      } else {
        onChange(actualizadas)
      }
    }

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(url: string) {
    if (!confirm('¿Eliminar esta foto?')) return
    setDeletingUrl(url)
    setError('')
    const supabase = createClient()
    const path = pathFromUrl(url)
    if (path) {
      await supabase.storage.from('motos').remove([path])
    }
    const actualizadas = fotos.filter(f => f !== url)
    const { error: updateErr } = await supabase
      .from('motos')
      .update({ fotos: actualizadas, updated_at: new Date().toISOString() })
      .eq('id', motoId)
    if (updateErr) {
      setError(`No se pudo eliminar: ${updateErr.message}`)
    } else {
      onChange(actualizadas)
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
