import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  const hasPrimary = Boolean(actionLabel && onAction)
  const hasSecondary = Boolean(secondaryActionLabel && onSecondaryAction)

  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-border/70 bg-card px-6 py-10 text-center shadow-sm',
        className,
      )}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted ring-1 ring-border/60">
        <Icon className="h-6 w-6 text-primary" aria-hidden />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {(hasPrimary || hasSecondary) && (
        <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
          {hasPrimary && (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
          {hasSecondary && (
            <Button variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}