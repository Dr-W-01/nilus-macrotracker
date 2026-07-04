import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  ModalViewport,
  ScrollDialogBody,
  ScrollDialogFooter,
  ScrollDialogHeader,
  scrollDialogContentClass,
} from '@/components/ui/scroll-modal'

interface DeleteMealProfileDialogProps {
  open: boolean
  profileName: string | null
  daysInUse: number
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteMealProfileDialog({
  open,
  profileName,
  daysInUse,
  onOpenChange,
  onConfirm,
}: DeleteMealProfileDialogProps) {
  if (!profileName) return null

  const inUse = daysInUse > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalViewport active={open} onRequestClose={() => onOpenChange(false)} />
      <DialogContent className={scrollDialogContentClass}>
        <ScrollDialogHeader>
          <DialogTitle>
            {inUse ? `Cannot delete "${profileName}"` : `Delete "${profileName}"?`}
          </DialogTitle>
        </ScrollDialogHeader>
        <ScrollDialogBody className="space-y-3 py-2">
          {inUse ? (
            <div className="flex gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div className="space-y-2 text-sm leading-relaxed">
                <p className="text-foreground">
                  This meal profile is assigned to{' '}
                  <span className="font-medium">
                    {daysInUse} logged {daysInUse === 1 ? 'day' : 'days'}
                  </span>
                  .
                </p>
                <p className="text-muted-foreground">
                  Deleting it would break historical meal grouping for those days. Create a new
                  profile or reassign those days before removing this one.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              No logged days use this profile. It will be permanently removed from your settings.
            </p>
          )}
        </ScrollDialogBody>
        <ScrollDialogFooter>
          {inUse ? (
            <Button size="lg" className="w-full" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
          ) : (
            <>
              <Button size="lg" className="w-full" onClick={onConfirm}>
                Delete profile
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Keep profile
              </Button>
            </>
          )}
        </ScrollDialogFooter>
      </DialogContent>
    </Dialog>
  )
}