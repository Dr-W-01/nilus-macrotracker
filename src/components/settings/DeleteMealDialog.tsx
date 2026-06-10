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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalViewport active={open} />
      <DialogContent className={scrollDialogContentClass}>
        <ScrollDialogHeader>
          <DialogTitle>Delete &quot;{meal}&quot;?</DialogTitle>
        </ScrollDialogHeader>
        <ScrollDialogBody className="space-y-3 py-2">
          <p className="text-sm text-foreground">
            Deleting this meal will move all previously logged food assigned to it to
            &quot;Uncategorized&quot;. This action cannot be undone. Are you sure you want to
            continue?
          </p>
          {assignedFoodCount > 0 && (
            <p className="text-sm font-medium text-primary">
              {assignedFoodCount}{' '}
              {assignedFoodCount === 1 ? 'logged item' : 'logged items'} will be moved to
              Uncategorized. No food data will be deleted.
            </p>
          )}
        </ScrollDialogBody>
        <ScrollDialogFooter>
          <Button
            size="lg"
            variant="destructive"
            className="w-full"
            onClick={onConfirm}
          >
            Delete meal
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </ScrollDialogFooter>
      </DialogContent>
    </Dialog>
  )
}