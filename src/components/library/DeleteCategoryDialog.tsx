import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete &quot;{category}&quot;?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {itemCount > 0
            ? `${itemCount} ${itemCount === 1 ? 'item uses' : 'items use'} this category.`
            : 'No items are tagged with this category.'}
        </p>
        <Button variant="outline" className="w-full" onClick={onUnlinkOnly}>
          Remove category from items
        </Button>
        {itemCount > 0 && (
          <Button variant="destructive" className="w-full" onClick={onDeleteItems}>
            Delete {itemCount} {itemCount === 1 ? 'item' : 'items'} too
          </Button>
        )}
        <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  )
}