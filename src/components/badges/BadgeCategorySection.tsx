import { BadgeCard } from '@/components/badges/BadgeCard'
import type { BadgeCategoryMeta, BadgeDefinition, BadgeId, BadgeProgress } from '@/lib/badges/types'

interface BadgeCategorySectionProps {
  meta: BadgeCategoryMeta
  badges: BadgeDefinition[]
  progress: Partial<Record<BadgeId, BadgeProgress>>
  weightTrackingEnabled: boolean
  burnTrackingEnabled: boolean
  highlightedBadgeId: BadgeId | null
  unviewedIds: BadgeId[]
  onBadgeClick: (id: BadgeId) => void
}

export function BadgeCategorySection({
  meta,
  badges,
  progress,
  weightTrackingEnabled,
  burnTrackingEnabled,
  highlightedBadgeId,
  unviewedIds,
  onBadgeClick,
}: BadgeCategorySectionProps) {
  if (badges.length === 0) return null

  const earnedInCategory = badges.filter((b) => (progress[b.id]?.instances.length ?? 0) > 0).length

  return (
    <section className="space-y-3">
      <div className="border-b border-border/60 pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{meta.title}</h2>
          <span className="shrink-0 text-xs text-muted-foreground">
            {earnedInCategory}/{badges.length}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{meta.description}</p>
      </div>

      <div className="grid grid-cols-3 items-stretch gap-3 sm:grid-cols-4">
        {badges.map((badge) => (
          <BadgeCard
            key={badge.id}
            badgeId={badge.id}
            progress={progress[badge.id]}
            weightTrackingEnabled={weightTrackingEnabled}
            burnTrackingEnabled={burnTrackingEnabled}
            highlighted={highlightedBadgeId === badge.id}
            isUnviewed={unviewedIds.includes(badge.id)}
            onClick={() => onBadgeClick(badge.id)}
          />
        ))}
      </div>
    </section>
  )
}