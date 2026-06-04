import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
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
    toast.success('Food added')
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ModalViewport active={open} />
      <SheetContent
        side="bottom"
        className={scrollSheetContentClass}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollSheetHeader>
          <SheetTitle>New Food</SheetTitle>
        </ScrollSheetHeader>
        <ScrollSheetBody>
          <FoodFormFields
            values={values}
            onChange={setValues}
            allCategories={allCategories}
          />
        </ScrollSheetBody>
        <ScrollSheetFooter>
          <Button size="lg" className="w-full" onClick={save}>
            Save Food
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