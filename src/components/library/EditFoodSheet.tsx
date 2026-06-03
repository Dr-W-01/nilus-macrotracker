import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  FoodFormFields,
  foodItemToFormValues,
  formValuesToFoodFields,
  type FoodFormValues,
} from '@/components/library/FoodFormFields'
import type { FoodItem } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'

interface EditFoodSheetProps {
  food: FoodItem | null
  onClose: () => void
}

export function EditFoodSheet({ food, onClose }: EditFoodSheetProps) {
  const updateFoodItem = useMacroStore((s) => s.updateFoodItem)
  const deleteFoodItems = useMacroStore((s) => s.deleteFoodItems)
  const [values, setValues] = useState<FoodFormValues | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    if (food) setValues(foodItemToFormValues(food))
    else setValues(null)
  }, [food])

  if (!food || !values) return null

  const isRecipe = food.isRecipe

  const save = () => {
    if (!values.name.trim()) {
      toast.error('Name is required')
      return
    }
    updateFoodItem(food.id, {
      ...formValuesToFoodFields(values),
      isRecipe: food.isRecipe,
      recipeComponents: food.recipeComponents,
    })
    toast.success('Food updated')
    onClose()
  }

  const handleDelete = () => {
    deleteFoodItems([food.id])
    toast.success('Food deleted')
    setDeleteConfirmOpen(false)
    onClose()
  }

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="shrink-0 border-b border-border px-4 py-3 pr-12 text-left">
            <SheetTitle>
              {isRecipe ? 'Edit Recipe' : 'Edit Food'}
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <FoodFormFields
              values={values}
              onChange={setValues}
              macrosReadOnly={isRecipe}
              scaleReadOnly={isRecipe}
            />
          </div>
          <div className="shrink-0 space-y-2 border-t border-border bg-card px-4 py-4 safe-bottom">
            <Button size="lg" className="w-full" onClick={save}>
              Save changes
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="w-full"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete food
            </Button>
            <Button size="lg" variant="ghost" className="w-full" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {food.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes the item from your library. Logged entries that reference
            it may show as unknown.
          </p>
          <Button variant="destructive" className="w-full" onClick={handleDelete}>
            Delete permanently
          </Button>
          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={() => setDeleteConfirmOpen(false)}
          >
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}