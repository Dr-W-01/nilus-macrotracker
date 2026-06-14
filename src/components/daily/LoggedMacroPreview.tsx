import { roundMacro } from '@/lib/macros'
import {
  MACRO_LABEL_TAILWIND,
  MACRO_NUTRIENT_ORDER,
  MACRO_SHORT_LABELS,
} from '@/lib/macroColors'
import type { MacroTotals } from '@/lib/types'
import { cn } from '@/lib/utils'

interface LoggedMacroPreviewProps {
  macros: MacroTotals
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xs'
  /** Render inline (span) for single-line layouts */
  inline?: boolean
  nowrap?: boolean
}

export function LoggedMacroPreview({
  macros,
  className,
  size = 'sm',
  inline = false,
  nowrap = false,
}: LoggedMacroPreviewProps) {
  const valueClass =
    size === 'xs'
      ? 'text-xs'
      : size === 'sm'
        ? 'text-[11px]'
        : size === 'lg'
          ? 'text-base'
          : 'text-sm'

  const Tag = inline ? 'span' : 'p'

  return (
    <Tag
      className={cn(
        'text-muted-foreground tabular-nums leading-tight',
        valueClass,
        inline && 'inline',
        nowrap && 'whitespace-nowrap',
        className,
      )}
    >
      {MACRO_NUTRIENT_ORDER.map((key, index) => {
        const short = MACRO_SHORT_LABELS[key]
        return (
          <span key={key}>
            {index > 0 && <span className="mx-1 opacity-50">•</span>}
            <MacroPart short={short} value={`${roundMacro(macros[key])}g`} />
          </span>
        )
      })}
    </Tag>
  )
}

function MacroPart({ short, value }: { short: keyof typeof MACRO_LABEL_TAILWIND; value: string }) {
  return (
    <span>
      <span className={MACRO_LABEL_TAILWIND[short]}>{short}</span>
      <span>: {value}</span>
    </span>
  )
}