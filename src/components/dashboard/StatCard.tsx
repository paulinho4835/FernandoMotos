import { formatBOB } from '@/lib/utils/formatCurrency'

interface Props {
  label: string
  value: number
  isCurrency?: boolean
  isCount?: boolean
  highlight?: 'green' | 'blue' | 'slate'
}

export function StatCard({ label, value, isCurrency, isCount, highlight = 'slate' }: Props) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  }
  return (
    <div className={`rounded-lg border p-4 ${colors[highlight]}`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">
        {isCurrency ? formatBOB(value) : isCount ? value.toString() : value}
      </p>
    </div>
  )
}
