import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  ModalViewport,
  ScrollDialogBody,
  ScrollDialogFooter,
  ScrollDialogHeader,
  scrollDialogContentClass,
} from '@/components/ui/scroll-modal'

interface DeleteCategoryDialogProps {
  open: boolean
  category: string | null
  itemCount: number
  onOpenChange: (open: boolean) => void
  onUnlinkOnly: () => void
  onDeleteItems: () => void
}

export function DeleteCategoryDialog({
  open,
  category,
  itemCount,
  onOpenChange,
  onUnlinkOnly,
  onDeleteItems,
}: DeleteCategoryDialogProps) {
  if (!category) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalViewport active={open} onRequestClose={() => onOpenChange(false)} />
      <DialogContent className={scrollDialogContentClass}>
        <ScrollDialogHeader>
          <DialogTitle>Delete &quot;{category}&quot;?</DialogTitle>
        </ScrollDialogHeader>
        <ScrollDialogBody className="py-2">
          <p className="text-sm text-muted-foreground">
            {itemCount > 0
              ? `${itemCount} ${itemCount === 1 ? 'item uses' : 'items use'} this category.`
              : 'No items are tagged with this category.'}
          </p>
        </ScrollDialogBody>
        <ScrollDialogFooter>
          <Button size="lg" variant="outline" className="w-full" onClick={onUnlinkOnly}>
            Remove category from items
          </Button>
          {itemCount > 0 && (
            <Button size="lg" variant="destructive" className="w-full" onClick={onDeleteItems}>
              Delete {itemCount} {itemCount === 1 ? 'item' : 'items'} too
            </Button>
          )}
          <Button size="lg" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </ScrollDialogFooter>
      </DialogContent>
    </Dialog>
  )
}