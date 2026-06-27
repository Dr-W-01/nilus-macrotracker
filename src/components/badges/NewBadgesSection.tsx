import { useMemo } from 'react'
import { BadgeCard } from '@/components/badges/BadgeCard'
import { Button } from '@/components/ui/button'
import { getBadgeCount } from '@/lib/badges/evaluate'
import type { BadgeId, BadgeProgress } from '@/lib/badges/types'
import { cn } from '@/lib/utils'

interface NewBadgesSectionProps {
  newSectionIds: BadgeId[]
  progress: Partial<Record<BadgeId, BadgeProgress>>
  weightTrackingEnabled: boolean
  burnTrackingEnabled: boolean
  onBadgeClick: (id: BadgeId) => void
  onClearAll: () => void
}

export function NewBadgesSection({
  newSectionIds,
  progress,
  weightTrackingEnabled,
  burnTrackingEnabled,
  onBadgeClick,
  onClearAll,
}: NewBadgesSectionProps) {
  const newBadges = useMemo(() => {
    return newSectionIds
      .filter((id) => getBadgeCount(progress[id]) > 0)
      .map((id) => ({
        id,
        earnedAt:
          progress[id]?.instances[progress[id]!.instances.length - 1]?.earnedAt ?? '',
      }))
      .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
  }, [newSectionIds, progress])

  if (newBadges.length === 0) return null

  const useHorizontalScroll = newBadges.length > 6

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">New Badges</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Recently earned — tap to view details
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 px-3 text-xs"
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
          <div className="flex w-max gap-3">
            {newBadges.map(({ id }) => (
              <div key={id} className="w-[calc((100vw-2rem-1.5rem)/3)] max-w-[7.5rem] shrink-0">
                <BadgeCard
                  badgeId={id}
                  progress={progress[id]}
                  weightTrackingEnabled={weightTrackingEnabled}
                  burnTrackingEnabled={burnTrackingEnabled}
                  isUnviewed
                  onClick={() => onBadgeClick(id)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
          {newBadges.map(({ id }) => (
            <BadgeCard
              key={id}
              badgeId={id}
              progress={progress[id]}
              weightTrackingEnabled={weightTrackingEnabled}
              burnTrackingEnabled={burnTrackingEnabled}
              isUnviewed
              onClick={() => onBadgeClick(id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}