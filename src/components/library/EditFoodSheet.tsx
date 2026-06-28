import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { toastFoodRemoved, toastFoodUpdated } from '@/lib/foodToast'
import { Info, UtensilsCrossed } from 'lucide-react'
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
import { SURFACE_GRADIENT_ROUNDED } from '@/lib/surfaceStyles'
import { cn } from '@/lib/utils'
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

  const save = () => {
    if (!values.name.trim()) {
      toast.error('Name is required')
      return
    }
    updateFoodItem(food.id, {
      ...formValuesToFoodFields(values),
      isRecipe: false,
    })
    toastFoodUpdated(values.name.trim() || food.name)
    onClose()
  }

  const handleDelete = () => {
    deleteFoodItems([food.id])
    toastFoodRemoved(food.name)
    setDeleteConfirmOpen(false)
    onClose()
  }

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <ModalViewport active onRequestClose={onClose} />
        <SheetContent
          side="bottom"
          className={scrollSheetContentClass}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScrollSheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" aria-hidden />
              Edit library food
            </SheetTitle>
            <p className="text-xs font-normal text-muted-foreground">
              Changes here update your Library for all future logs. To edit a single
              day&apos;s entry, use the Daily tab.
            </p>
          </ScrollSheetHeader>
          <ScrollSheetBody>
            <div className={cn(SURFACE_GRADIENT_ROUNDED, 'mb-4 flex gap-3 px-3 py-2.5')}>
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Editing <span className="font-medium text-foreground">{food.name}</span> in your
                library. Saved changes apply everywhere this food is used.
              </p>
            </div>
            <FoodFormFields
              values={values}
              onChange={setValues}
              allCategories={allCategories}
              macrosReadOnly={false}
              scaleReadOnly={false}
            />
          </ScrollSheetBody>
          <ScrollSheetFooter>
            <Button size="sm" className="w-full" onClick={save}>
              Save changes
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="w-full"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete food
            </Button>
            <Button size="sm" variant="ghost" className="w-full" onClick={onClose}>
              Cancel
            </Button>
          </ScrollSheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <ModalViewport active={deleteConfirmOpen} onRequestClose={() => setDeleteConfirmOpen(false)} />
        <DialogContent className={scrollDialogContentClass}>
          <ScrollDialogHeader>
            <DialogTitle>Delete {food.name}?</DialogTitle>
          </ScrollDialogHeader>
          <ScrollDialogBody className="space-y-3 py-2">
            <div className={cn(SURFACE_GRADIENT_ROUNDED, 'flex gap-3 px-3 py-3')}>
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div className="space-y-2 text-sm leading-relaxed">
                <p className="text-foreground">
                  <span className="font-medium">{food.name}</span> will be removed from your
                  library.
                </p>
                <p className="text-muted-foreground">
                  Foods already logged on the Daily tab are kept in your history. They may
                  show as &quot;Unknown&quot; until you delete those entries manually.
                </p>
              </div>
            </div>
          </ScrollDialogBody>
          <ScrollDialogFooter>
            <Button variant="destructive" size="lg" className="w-full" onClick={handleDelete}>
              Remove from library
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