import { toast } from 'sonner'
import { BADGE_BY_ID } from '@/lib/badges/definitions'
import type { BadgeId } from '@/lib/badges/types'
import { useMacroStore } from '@/store/useMacroStore'

function openBadgeFromToast(badgeId: BadgeId, toastId: string | number) {
  const store = useMacroStore.getState()
  store.setCurrentTab('badges')
  store.setOpenBadgeDetailId(badgeId)
  store.setHighlightedBadgeId(badgeId)
  toast.dismiss(toastId)
}

export function toastBadgeUnlocked(badgeId: BadgeId): void {
  const def = BADGE_BY_ID[badgeId]
  if (!def) return

  toast.custom(
    (toastId) => (
      <button
        type="button"
        className="badge-unlock-toast w-[var(--width)] max-w-[calc(100vw-2rem)] rounded-lg border px-4 py-3 text-left shadow-lg transition-opacity hover:opacity-95"
        onClick={() => openBadgeFromToast(badgeId, toastId)}
      >
        <p className="text-sm font-semibold text-foreground">
          🎉 Badge unlocked: {def.name}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{def.description}</p>
        <p className="mt-1.5 text-[10px] font-medium text-primary/90">Tap to view badge</p>
      </button>
    ),
    { duration: 5500 },
  )
}

export function toastBadgesUnlocked(badgeIds: BadgeId[]): void {
  for (const id of badgeIds) {
    toastBadgeUnlocked(id)
  }
}