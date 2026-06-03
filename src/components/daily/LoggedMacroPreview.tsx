import { roundMacro } from '@/lib/macros'
import type { MacroTotals } from '@/lib/types'
import { cn } from '@/lib/utils'

const MACRO_LABEL_CLASS = {
  P: 'font-semibold text-emerald-400',
  C: 'font-semibold text-amber-400',
  F: 'font-semibold text-purple-400',
  Fib: 'font-semibold text-lime-500',
  S: 'font-semibold text-pink-400',
} as const

interface LoggedMacroPreviewProps {
  macros: MacroTotals
  className?: string
  size?: 'sm' | 'md'
}

export function LoggedMacroPreview({
  macros,
  className,
  size = 'sm',
}: LoggedMacroPreviewProps) {
  const valueClass = size === 'sm' ? 'text-[11px]' : 'text-sm'

  return (
    <p
      className={cn(
        'text-muted-foreground tabular-nums leading-tight',
        valueClass,
        className,
      )}
    >
      <MacroPart label="P" value={`${roundMacro(macros.protein)}g`} />
      <span className="mx-1 opacity-50">•</span>
      <MacroPart label="C" value={`${roundMacro(macros.carbs)}g`} />
      <span className="mx-1 opacity-50">•</span>
      <MacroPart label="F" value={`${roundMacro(macros.fat)}g`} />
      <span className="mx-1 opacity-50">•</span>
      <MacroPart label="Fib" value={`${roundMacro(macros.fiber)}g`} />
      <span className="mx-1 opacity-50">•</span>
      <MacroPart label="S" value={`${roundMacro(macros.sugars)}g`} />
    </p>
  )
}

function MacroPart({ label, value }: { label: keyof typeof MACRO_LABEL_CLASS; value: string }) {
  return (
    <span>
      <span className={MACRO_LABEL_CLASS[label]}>{label}</span>
      <span>: {value}</span>
    </span>
  )
}