import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { toastFoodAdded } from '@/lib/foodToast'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ModalViewport,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetHeader,
  scrollSheetContentClass,
} from '@/components/ui/scroll-modal'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  emptyFoodFormValues,
  FoodFormFields,
  formValuesToFoodFields,
  type FoodFormValues,
} from '@/components/library/FoodFormFields'
import { collectAllCategories } from '@/lib/categories'
import { useMacroStore } from '@/store/useMacroStore'

interface NewFoodSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewFoodSheet({ open, onOpenChange }: NewFoodSheetProps) {
  const addFoodItem = useMacroStore((s) => s.addFoodItem)
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const customCategories = useMacroStore((s) => s.customCategories)
  const allCategories = useMemo(
    () => collectAllCategories(foodLibrary, customCategories),
    [foodLibrary, customCategories],
  )
  const [values, setValues] = useState<FoodFormValues>(emptyFoodFormValues())

  useEffect(() => {
    if (open) setValues(emptyFoodFormValues())
  }, [open])

  const save = () => {
    if (!values.name.trim()) {
      toast.error('Name is required')
      return
    }
    addFoodItem({
      ...formValuesToFoodFields(values),
      isRecipe: false,
    })
    toastFoodAdded(values.name.trim())
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ModalViewport active={open} onRequestClose={() => onOpenChange(false)} />
      <SheetContent
        side="bottom"
        className={scrollSheetContentClass}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollSheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" aria-hidden />
            New food
          </SheetTitle>
          <p className="text-xs font-normal text-muted-foreground">
            Add a food to your library with nutrition facts per serving.
          </p>
        </ScrollSheetHeader>
        <ScrollSheetBody className="space-y-1">
          <FoodFormFields
            values={values}
            onChange={setValues}
            allCategories={allCategories}
          />
        </ScrollSheetBody>
        <ScrollSheetFooter>
          <Button size="lg" className="w-full" onClick={save}>
            Save food
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </ScrollSheetFooter>
      </SheetContent>
    </Sheet>
  )
}