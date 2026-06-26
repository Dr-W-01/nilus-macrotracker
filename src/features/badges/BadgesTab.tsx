import { useEffect, useMemo, useRef, useState } from 'react'
import { Award } from 'lucide-react'
import { BadgeCard } from '@/components/badges/BadgeCard'
import { BadgeDetailDialog } from '@/components/badges/BadgeDetailDialog'
import { BADGE_DEFINITIONS } from '@/lib/badges/definitions'
import { getBadgeCount } from '@/lib/badges/evaluate'
import type { BadgeId } from '@/lib/badges/types'
import { isTrackCurrentWeightEnabled } from '@/lib/trackingSettings'
import { useMacroStore } from '@/store/useMacroStore'

export function BadgesTab() {
  const badgeState = useMacroStore((s) => s.badgeState)
  const settings = useMacroStore((s) => s.settings)
  const highlightedBadgeId = useMacroStore((s) => s.highlightedBadgeId)
  const openBadgeDetailId = useMacroStore((s) => s.openBadgeDetailId)
  const setHighlightedBadgeId = useMacroStore((s) => s.setHighlightedBadgeId)
  const setOpenBadgeDetailId = useMacroStore((s) => s.setOpenBadgeDetailId)
  const markBadgesViewed = useMacroStore((s) => s.markBadgesViewed)
  const unviewedIds = useMacroStore((s) => s.badgeState.unviewedBadgeIds)

  const [detailId, setDetailId] = useState<BadgeId | null>(null)
  const highlightRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const weightTrackingEnabled = isTrackCurrentWeightEnabled(settings)

  const earnedCount = useMemo(
    () =>
      BADGE_DEFINITIONS.filter((b) => getBadgeCount(badgeState.progress[b.id]) > 0).length,
    [badgeState.progress],
  )

  useEffect(() => {
    markBadgesViewed()
  }, [markBadgesViewed])

  useEffect(() => {
    if (openBadgeDetailId) {
      setDetailId(openBadgeDetailId)
      setOpenBadgeDetailId(null)
    }
  }, [openBadgeDetailId, setOpenBadgeDetailId])

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
      <header className="tab-sticky-header px-4 py-3">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" aria-hidden />
          <div>
            <h1 className="text-lg font-semibold">Badges</h1>
            <p className="text-xs text-muted-foreground">
              {earnedCount} of {BADGE_DEFINITIONS.length} earned
            </p>
          </div>
        </div>
      </header>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {BADGE_DEFINITIONS.map((badge) => (
            <BadgeCard
              key={badge.id}
              badgeId={badge.id}
              progress={badgeState.progress[badge.id]}
              weightTrackingEnabled={weightTrackingEnabled}
              highlighted={highlightedBadgeId === badge.id}
              isUnviewed={unviewedIds.includes(badge.id)}
              onClick={() => setDetailId(badge.id)}
            />
          ))}
        </div>
      </div>

      <BadgeDetailDialog
        badgeId={detailId}
        progress={detailId ? badgeState.progress[detailId] : undefined}
        weightTrackingEnabled={weightTrackingEnabled}
        onClose={closeDetail}
      />
    </div>
  )
}