import { useEffect, useMemo, useRef, useState } from 'react'
import { Award } from 'lucide-react'
import { BadgeCategorySection } from '@/components/badges/BadgeCategorySection'
import { NewBadgesSection } from '@/components/badges/NewBadgesSection'
import { BadgeDetailDialog } from '@/components/badges/BadgeDetailDialog'
import { BADGE_CATEGORY_META, badgesByCategory } from '@/lib/badges/categories'
import { BADGE_DEFINITIONS } from '@/lib/badges/definitions'
import { getBadgeCount } from '@/lib/badges/evaluate'
import type { BadgeId } from '@/lib/badges/types'
import {
  isTrackBurnedCaloriesEnabled,
  isTrackCurrentWeightEnabled,
} from '@/lib/trackingSettings'
import { useMacroStore } from '@/store/useMacroStore'

export function BadgesTab() {
  const badgeState = useMacroStore((s) => s.badgeState)
  const settings = useMacroStore((s) => s.settings)
  const highlightedBadgeId = useMacroStore((s) => s.highlightedBadgeId)
  const openBadgeDetailId = useMacroStore((s) => s.openBadgeDetailId)
  const setHighlightedBadgeId = useMacroStore((s) => s.setHighlightedBadgeId)
  const setOpenBadgeDetailId = useMacroStore((s) => s.setOpenBadgeDetailId)
  const markBadgeViewed = useMacroStore((s) => s.markBadgeViewed)
  const unviewedIds = useMacroStore((s) => s.badgeState.unviewedBadgeIds)

  const [detailId, setDetailId] = useState<BadgeId | null>(null)
  const highlightRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const weightTrackingEnabled = isTrackCurrentWeightEnabled(settings)
  const burnTrackingEnabled = isTrackBurnedCaloriesEnabled(settings)

  const badgesGrouped = useMemo(() => badgesByCategory(), [])

  const earnedCount = useMemo(
    () =>
      BADGE_DEFINITIONS.filter((b) => getBadgeCount(badgeState.progress[b.id]) > 0).length,
    [badgeState.progress],
  )

  const openBadgeDetail = (id: BadgeId) => {
    setDetailId(id)
    markBadgeViewed(id)
  }

  useEffect(() => {
    if (!openBadgeDetailId) return
    setDetailId(openBadgeDetailId)
    markBadgeViewed(openBadgeDetailId)
    setOpenBadgeDetailId(null)
  }, [openBadgeDetailId, setOpenBadgeDetailId, markBadgeViewed])

  useEffect(() => {
    if (!highlightedBadgeId) return
    const el = document.querySelector(`[data-badge-id="${highlightedBadgeId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (highlightRef.current) clearTimeout(highlightRef.current)
    highlightRef.current = setTimeout(() => {
      setHighlightedBadgeId(null)
    }, 2400)
    return () => {
      if (highlightRef.current) clearTimeout(highlightRef.current)
    }
  }, [highlightedBadgeId, setHighlightedBadgeId])

  const closeDetail = () => {
    setDetailId(null)
    setHighlightedBadgeId(null)
  }

  return (
    <div className="badges-tab pb-below-nav">
      <header className="tab-sticky-header flex min-h-14 items-center px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Award className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <h1 className="truncate whitespace-nowrap text-xl font-bold">
            Badges ({earnedCount} / {BADGE_DEFINITIONS.length} earned)
          </h1>
        </div>
      </header>

      <div className="space-y-8 p-4">
        <NewBadgesSection
          unviewedIds={unviewedIds}
          progress={badgeState.progress}
          weightTrackingEnabled={weightTrackingEnabled}
          burnTrackingEnabled={burnTrackingEnabled}
          onBadgeClick={openBadgeDetail}
        />

        {BADGE_CATEGORY_META.map((meta) => (
          <BadgeCategorySection
            key={meta.id}
            meta={meta}
            badges={badgesGrouped[meta.id]}
            progress={badgeState.progress}
            weightTrackingEnabled={weightTrackingEnabled}
            burnTrackingEnabled={burnTrackingEnabled}
            highlightedBadgeId={highlightedBadgeId}
            unviewedIds={unviewedIds}
            onBadgeClick={openBadgeDetail}
          />
        ))}
      </div>

      <BadgeDetailDialog
        badgeId={detailId}
        progress={detailId ? badgeState.progress[detailId] : undefined}
        weightTrackingEnabled={weightTrackingEnabled}
        burnTrackingEnabled={burnTrackingEnabled}
        onClose={closeDetail}
      />
    </div>
  )
}