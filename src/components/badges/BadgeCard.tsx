import { BADGE_BY_ID } from '@/lib/badges/definitions'
import { getBadgeCount } from '@/lib/badges/evaluate'
import type { BadgeId, BadgeProgress } from '@/lib/badges/types'
import { cn } from '@/lib/utils'

interface BadgeCardProps {
  badgeId: BadgeId
  progress?: BadgeProgress
  weightTrackingEnabled: boolean
  burnTrackingEnabled: boolean
  highlighted?: boolean
  isUnviewed?: boolean
  onClick: () => void
}

export function BadgeCard({
  badgeId,
  progress,
  weightTrackingEnabled,
  burnTrackingEnabled,
  highlighted,
  isUnviewed,
  onClick,
}: BadgeCardProps) {
  const def = BADGE_BY_ID[badgeId]
  const count = getBadgeCount(progress)
  const earned = count > 0
  const weightLocked = def.weightBased && !weightTrackingEnabled && !earned
  const burnLocked = def.burnBased && !burnTrackingEnabled && !earned
  const featureLocked = weightLocked || burnLocked

  const lockHint = weightLocked
    ? 'Enable weight tracking to unlock'
    : burnLocked
      ? 'Enable burned calories to unlock'
      : null

  return (
    <button
      type="button"
      data-badge-id={badgeId}
      onClick={onClick}
      className={cn(
        'relative flex h-full w-full flex-col items-center justify-center rounded-lg border p-2 text-center transition-all',
        'min-h-[80px] active:scale-[0.98]',
        earned && !featureLocked
          ? 'border-primary/40 bg-primary/10 shadow-sm'
          : 'border-border/60 bg-card/50',
        !earned && 'opacity-55 grayscale-[0.35]',
        featureLocked && 'opacity-45 grayscale-[0.5]',
        highlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      {isUnviewed && earned && !featureLocked && (
        <span
          className="badge-new-pill absolute left-0.5 top-0.5 z-10 rounded px-1 py-0.5 text-[7px] font-bold uppercase leading-none tracking-wide shadow-sm"
          aria-label="Newly earned"
        >
          NEW
        </span>
      )}
      {count > 1 && (
        <span className="absolute right-0.5 top-0.5 z-10 rounded-full bg-primary px-1 py-0.5 text-[9px] font-bold text-primary-foreground shadow-sm">
          ×{count}
        </span>
      )}
      <div className="flex w-full flex-col items-center justify-center gap-1 px-0.5">
        <span
          className={cn(
            'flex h-7 shrink-0 items-center justify-center text-2xl leading-none',
            earned && !featureLocked ? 'drop-shadow-sm' : 'opacity-80',
          )}
          aria-hidden
        >
          {def.icon}
        </span>
        <span
          className={cn(
            'line-clamp-2 w-full text-[10px] font-semibold leading-tight',
            earned && !featureLocked ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {def.name}
        </span>
        {lockHint && (
          <span className="line-clamp-2 w-full text-[9px] leading-snug text-muted-foreground">
            {lockHint}
          </span>
        )}
      </div>
    </button>
  )
}