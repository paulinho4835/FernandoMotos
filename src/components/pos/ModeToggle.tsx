'use client'
import type { TipoVenta } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Package, Bike } from 'lucide-react'

interface Props {
  mode: TipoVenta
  onChange: (mode: TipoVenta) => void
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
      <Button
        size="sm"
        variant={mode === 'repuesto' ? 'default' : 'ghost'}
        onClick={() => onChange('repuesto')}
        className="gap-2"
      >
        <Package size={14} /> Repuesto
      </Button>
      <Button
        size="sm"
        variant={mode === 'moto' ? 'default' : 'ghost'}
        onClick={() => onChange('moto')}
        className="gap-2"
      >
        <Bike size={14} /> Moto
      </Button>
    </div>
  )
}
