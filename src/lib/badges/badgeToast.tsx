import { toast } from 'sonner'
import { BADGE_BY_ID } from '@/lib/badges/definitions'
import type { BadgeId } from '@/lib/badges/types'
import { useMacroStore } from '@/store/useMacroStore'

const BADGE_TOAST_DURATION = 5000

const BADGE_TOAST_OPTIONS = {
  duration: BADGE_TOAST_DURATION,
  dismissible: true,
  closeButton: true,
  classNames: {
    toast: 'badge-unlock-toast',
    title: 'text-sm font-semibold',
    description: 'text-xs text-muted-foreground',
    actionButton:
      'badge-unlock-toast-action bg-primary/15 text-primary hover:bg-primary/25 border-primary/30',
    closeButton: 'badge-unlock-toast-close',
  },
} as const

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

  const toastId = toast(`🎉 Badge unlocked: ${def.name}`, {
    ...BADGE_TOAST_OPTIONS,
    description: def.description,
    action: {
      label: 'View badge',
      onClick: () => openBadgeFromToast(badgeId, toastId),
    },
  })
}

export function toastBadgesUnlocked(badgeIds: BadgeId[]): void {
  for (const id of badgeIds) {
    toastBadgeUnlocked(id)
  }
}