import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  ModalViewport,
  ScrollDialogBody,
  ScrollDialogFooter,
  ScrollDialogHeader,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetHeader,
  scrollDialogContentClass,
  scrollSheetContentClass,
} from '@/components/ui/scroll-modal'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  FoodFormFields,
  foodItemToFormValues,
  formValuesToFoodFields,
  type FoodFormValues,
} from '@/components/library/FoodFormFields'
import type { FoodItem } from '@/lib/types'
import { collectAllCategories } from '@/lib/categories'
import { useMacroStore } from '@/store/useMacroStore'

interface EditFoodSheetProps {
  food: FoodItem | null
  onClose: () => void
}

export function EditFoodSheet({ food, onClose }: EditFoodSheetProps) {
  const updateFoodItem = useMacroStore((s) => s.updateFoodItem)
  const deleteFoodItems = useMacroStore((s) => s.deleteFoodItems)
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const customCategories = useMacroStore((s) => s.customCategories)
  const allCategories = useMemo(
    () => collectAllCategories(foodLibrary, customCategories),
    [foodLibrary, customCategories],
  )
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
        <ModalViewport active />
        <SheetContent
          side="bottom"
          className={scrollSheetContentClass}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScrollSheetHeader>
            <SheetTitle>
              {isRecipe ? 'Edit master recipe' : 'Edit library food'}
            </SheetTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Changes here update your Library for all future logs. To edit a single
              day&apos;s entry, use the Daily tab.
            </p>
          </ScrollSheetHeader>
          <ScrollSheetBody>
            <FoodFormFields
              values={values}
              onChange={setValues}
              allCategories={allCategories}
              macrosReadOnly={isRecipe}
              scaleReadOnly={isRecipe}
            />
          </ScrollSheetBody>
          <ScrollSheetFooter>
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
          </ScrollSheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <ModalViewport active={deleteConfirmOpen} />
        <DialogContent className={scrollDialogContentClass}>
          <ScrollDialogHeader>
            <DialogTitle>Delete {food.name}?</DialogTitle>
          </ScrollDialogHeader>
          <ScrollDialogBody className="py-2">
            <p className="text-sm text-muted-foreground">
              This removes the item from your library. Logged entries that reference
              it may show as unknown.
            </p>
          </ScrollDialogBody>
          <ScrollDialogFooter>
            <Button variant="destructive" size="lg" className="w-full" onClick={handleDelete}>
              Delete permanently
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
          </ScrollDialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}