import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  emptyFoodFormValues,
  FoodFormFields,
  formValuesToFoodFields,
  type FoodFormValues,
} from '@/components/library/FoodFormFields'
import { useMacroStore } from '@/store/useMacroStore'

interface NewFoodSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewFoodSheet({ open, onOpenChange }: NewFoodSheetProps) {
  const addFoodItem = useMacroStore((s) => s.addFoodItem)
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
      <SheetContent
        side="bottom"
        className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0"
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 py-3 pr-12 text-left">
          <SheetTitle>New Food</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <FoodFormFields values={values} onChange={setValues} />
        </div>
        <div className="shrink-0 space-y-2 border-t border-border bg-card px-4 py-4 safe-bottom">
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
        </div>
      </SheetContent>
    </Sheet>
  )
}