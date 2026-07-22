'use client'
import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  titulo: string
  fotos: string[]
  onClose: () => void
}

export function FotosLightbox({ titulo, fotos, onClose }: Props) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex(i => (i + 1) % fotos.length)
      if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + fotos.length) % fotos.length)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fotos.length, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
        <span className="font-medium">{titulo}</span>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full" title="Cerrar">
          <X size={22} />
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center px-4 pb-4 min-h-0">
        {fotos.length > 1 && (
          <button
            onClick={() => setIndex(i => (i - 1 + fotos.length) % fotos.length)}
            className="absolute left-2 md:left-6 p-2 text-white hover:bg-white/10 rounded-full"
            title="Anterior"
          >
            <ChevronLeft size={32} />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fotos[index]}
          alt={titulo}
          className="max-w-full max-h-full object-contain rounded"
        />
        {fotos.length > 1 && (
          <button
            onClick={() => setIndex(i => (i + 1) % fotos.length)}
            className="absolute right-2 md:right-6 p-2 text-white hover:bg-white/10 rounded-full"
            title="Siguiente"
          >
            <ChevronRight size={32} />
          </button>
        )}
      </div>

      {fotos.length > 1 && (
        <div className="flex items-center justify-center gap-2 pb-4 shrink-0">
          {fotos.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full ${i === index ? 'bg-white' : 'bg-white/30'}`}
              title={`Foto ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
