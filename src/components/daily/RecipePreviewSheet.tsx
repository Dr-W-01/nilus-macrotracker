import { useMemo } from 'react'
import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { MealPicker } from '@/components/daily/MealPicker'
import { RecipeInstanceMacroBar } from '@/components/daily/RecipeInstanceEditor'
import { Button } from '@/components/ui/button'
import {
  ModalViewport,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetHeader,
  scrollSheetContentClass,
} from '@/components/ui/scroll-modal'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { computeComponentMacros } from '@/lib/macros'
import type { FoodItem } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'

interface RecipePreviewSheetProps {
  open: boolean
  food: FoodItem | null
  meals: string[]
  onOpenChange: (open: boolean) => void
  onAdd: (meal?: string) => void
  onEdit: () => void
  onCancel: () => void
}

export function RecipePreviewSheet({
  open,
  food,
  meals,
  onOpenChange,
  onAdd,
  onEdit,
  onCancel,
}: RecipePreviewSheetProps) {
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const [meal, setMeal] = useState('')

  useEffect(() => {
    if (open) setMeal('')
  }, [open, meals])

  const totals = useMemo(() => {
    if (!food?.recipeComponents) return null
    return computeComponentMacros(foodLibrary, food.recipeComponents)
  }, [food, foodLibrary])

  if (!food) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ModalViewport active={open} />
      <SheetContent
        side="bottom"
        className={scrollSheetContentClass}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollSheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>🍱</span> {food.name}
          </SheetTitle>
        </ScrollSheetHeader>
        <ScrollSheetBody className="space-y-4">
          {totals && <RecipeInstanceMacroBar macros={totals} />}
          <MealPicker
            label="Meal"
            meals={meals}
            value={meal}
            onChange={setMeal}
          />
        </ScrollSheetBody>
        <ScrollSheetFooter>
          <Button size="lg" className="w-full" onClick={() => onAdd(meal || undefined)}>
            Add
          </Button>
          <Button size="lg" variant="outline" className="w-full gap-2" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Customize for today
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        </ScrollSheetFooter>
      </SheetContent>
    </Sheet>
  )
}