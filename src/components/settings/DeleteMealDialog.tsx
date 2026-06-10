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

interface DeleteMealDialogProps {
  open: boolean
  meal: string | null
  assignedFoodCount: number
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteMealDialog({
  open,
  meal,
  assignedFoodCount,
  onOpenChange,
  onConfirm,
}: DeleteMealDialogProps) {
  if (!meal) return null

  const hasLoggedFood = assignedFoodCount > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalViewport active={open} />
      <DialogContent className={scrollDialogContentClass}>
        <ScrollDialogHeader>
          <DialogTitle>Remove &quot;{meal}&quot; meal?</DialogTitle>
        </ScrollDialogHeader>
        <ScrollDialogBody className="space-y-3 py-2">
          {hasLoggedFood ? (
            <>
              <div className="flex gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="space-y-2 text-sm leading-relaxed">
                  <p className="text-foreground">
                    This meal has{' '}
                    <span className="font-medium">
                      {assignedFoodCount} logged{' '}
                      {assignedFoodCount === 1 ? 'entry' : 'entries'}
                    </span>{' '}
                    across your daily logs.
                  </p>
                  <p className="text-muted-foreground">
                    Removing the meal only changes how those entries are grouped. Every logged
                    food will move to <span className="font-medium text-foreground">Uncategorized</span>{' '}
                    on the Daily tab.
                  </p>
                  <p className="font-medium text-emerald-400/90">
                    Your food data, macros, and history are kept — nothing is deleted.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You can reassign those entries to another meal anytime while editing a day.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              No foods are currently assigned to this meal. Removing it only updates your meal
              list on the Daily tab.
            </p>
          )}
        </ScrollDialogBody>
        <ScrollDialogFooter>
          <Button size="lg" className="w-full" onClick={onConfirm}>
            {hasLoggedFood ? 'Remove meal & move food to Uncategorized' : 'Remove meal'}
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Keep meal
          </Button>
        </ScrollDialogFooter>
      </DialogContent>
    </Dialog>
  )
}