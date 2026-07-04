import type { LucideIcon } from 'lucide-react'
import { SURFACE_GRADIENT_COMPACT } from '@/lib/surfaceStyles'
import { cn } from '@/lib/utils'

interface TrackingToggleProps {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  icon?: LucideIcon
}

export function TrackingToggle({
  label,
  description,
  checked,
  onCheckedChange,
  icon: Icon,
}: TrackingToggleProps) {
  return (
    <div className={cn(SURFACE_GRADIENT_COMPACT, 'flex items-center justify-between gap-3 p-3')}>
      <div className="min-w-0 space-y-0.5">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
          {label}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted',
        )}
        onClick={() => onCheckedChange(!checked)}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  )
}