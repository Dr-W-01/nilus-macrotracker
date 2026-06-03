import { formatCompactMacroLine } from '@/lib/macros'
import type { MacroTotals } from '@/lib/types'
import { cn } from '@/lib/utils'

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
  return (
    <p
      className={cn(
        'text-muted-foreground tabular-nums',
        size === 'sm' ? 'text-[11px] leading-tight' : 'text-sm',
        className,
      )}
    >
      {formatCompactMacroLine(macros)}
    </p>
  )
}