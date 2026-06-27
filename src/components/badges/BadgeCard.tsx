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

  return (
    <button
      type="button"
      data-badge-id={badgeId}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all',
        'min-h-[108px] active:scale-[0.98]',
        earned && !featureLocked
          ? 'border-primary/40 bg-primary/10 shadow-sm'
          : 'border-border/60 bg-card/50',
        !earned && 'opacity-55 grayscale-[0.35]',
        featureLocked && 'opacity-45 grayscale-[0.5]',
        highlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      {isUnviewed && (
        <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-destructive" aria-hidden />
      )}
      {count > 1 && (
        <span className="absolute right-2 top-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
          ×{count}
        </span>
      )}
      <span
        className={cn(
          'text-3xl leading-none',
          earned && !featureLocked ? 'drop-shadow-sm' : 'opacity-80',
        )}
        aria-hidden
      >
        {def.icon}
      </span>
      <span
        className={cn(
          'text-xs font-semibold leading-tight',
          earned && !featureLocked ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {def.name}
      </span>
      {weightLocked && (
        <span className="text-[10px] leading-snug text-muted-foreground">
          Enable weight tracking to unlock
        </span>
      )}
      {burnLocked && (
        <span className="text-[10px] leading-snug text-muted-foreground">
          Enable burned calories to unlock
        </span>
      )}
    </button>
  )
}