import { useMemo } from 'react'
import { BadgeCard } from '@/components/badges/BadgeCard'
import { Button } from '@/components/ui/button'
import { getRecentlyAwardedBadges } from '@/lib/badges/evaluate'
import type { BadgeId, BadgeProgress, BadgeState } from '@/lib/badges/types'
import { cn } from '@/lib/utils'

interface NewBadgesSectionProps {
  badgeState: BadgeState
  unviewedIds: BadgeId[]
  progress: Partial<Record<BadgeId, BadgeProgress>>
  weightTrackingEnabled: boolean
  burnTrackingEnabled: boolean
  onBadgeClick: (id: BadgeId) => void
  onClearAll: () => void
}

export function NewBadgesSection({
  badgeState,
  unviewedIds,
  progress,
  weightTrackingEnabled,
  burnTrackingEnabled,
  onBadgeClick,
  onClearAll,
}: NewBadgesSectionProps) {
  const newBadges = useMemo(
    () => getRecentlyAwardedBadges(badgeState),
    [badgeState],
  )

  if (newBadges.length === 0) return null

  const useHorizontalScroll = newBadges.length > 4

  return (
    <section className="space-y-2">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-1.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">New Badges</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Recently awarded — tap to view details
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 px-2 text-[10px]"
          onClick={onClearAll}
        >
          Clear All
        </Button>
      </div>

      {useHorizontalScroll ? (
        <div
          className={cn(
            '-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-1',
            '[-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          <div
            className="grid w-max grid-flow-col grid-rows-2 gap-2"
            style={{ gridAutoColumns: 'calc((min(100vw - 2rem, 32rem) - 0.5rem) / 2)' }}
          >
            {newBadges.map(({ id }) => (
              <BadgeCard
                key={id}
                badgeId={id}
                progress={progress[id]}
                weightTrackingEnabled={weightTrackingEnabled}
                burnTrackingEnabled={burnTrackingEnabled}
                isUnviewed={unviewedIds.includes(id)}
                onClick={() => onBadgeClick(id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 items-stretch gap-2">
          {newBadges.map(({ id }) => (
            <BadgeCard
              key={id}
              badgeId={id}
              progress={progress[id]}
              weightTrackingEnabled={weightTrackingEnabled}
              burnTrackingEnabled={burnTrackingEnabled}
              isUnviewed={unviewedIds.includes(id)}
              onClick={() => onBadgeClick(id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}