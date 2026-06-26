import { format, parseISO } from 'date-fns'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  ModalViewport,
  ScrollDialogBody,
  ScrollDialogFooter,
  ScrollDialogHeader,
  scrollDialogContentClass,
} from '@/components/ui/scroll-modal'
import { Button } from '@/components/ui/button'
import { BADGE_BY_ID } from '@/lib/badges/definitions'
import { getBadgeCount } from '@/lib/badges/evaluate'
import type { BadgeId, BadgeProgress } from '@/lib/badges/types'
import { cn } from '@/lib/utils'

interface BadgeDetailDialogProps {
  badgeId: BadgeId | null
  progress?: BadgeProgress
  weightTrackingEnabled: boolean
  onClose: () => void
}

export function BadgeDetailDialog({
  badgeId,
  progress,
  weightTrackingEnabled,
  onClose,
}: BadgeDetailDialogProps) {
  if (!badgeId) return null

  const def = BADGE_BY_ID[badgeId]
  const count = getBadgeCount(progress)
  const earned = count > 0
  const weightLocked = def.weightBased && !weightTrackingEnabled && !earned
  const instances = [...(progress?.instances ?? [])].sort((a, b) =>
    b.earnedAt.localeCompare(a.earnedAt),
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <ModalViewport active />
      <DialogContent className={scrollDialogContentClass}>
        <ScrollDialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span
              className={cn(
                'text-4xl',
                !earned && 'opacity-50 grayscale',
              )}
              aria-hidden
            >
              {def.icon}
            </span>
            <span className="flex flex-col gap-0.5 text-left">
              <span>{def.name}</span>
              {count > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  Earned {count} {count === 1 ? 'time' : 'times'}
                </span>
              )}
            </span>
          </DialogTitle>
        </ScrollDialogHeader>
        <ScrollDialogBody className="space-y-4 py-2">
          <div>
            <p className="text-sm text-foreground">{def.description}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/80">How to earn: </span>
              {def.howToEarn}
            </p>
          </div>

          {weightLocked && (
            <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
              Enable <span className="font-medium text-foreground">Track current weight</span> in
              Settings to unlock this badge.
            </p>
          )}

          {earned ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {def.recurring ? 'Earned on' : 'Earned'}
              </p>
              <ul className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {instances.map((inst) => (
                  <li
                    key={inst.periodKey ?? inst.earnedAt}
                    className="px-3 py-2.5 text-sm text-foreground"
                  >
                    {format(parseISO(inst.earnedAt), 'MMM d, yyyy')}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Not earned yet — keep logging!</p>
          )}
        </ScrollDialogBody>
        <ScrollDialogFooter>
          <Button size="lg" variant="ghost" className="w-full" onClick={onClose}>
            Close
          </Button>
        </ScrollDialogFooter>
      </DialogContent>
    </Dialog>
  )
}