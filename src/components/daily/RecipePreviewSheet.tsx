import { useMemo } from 'react'
import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { MealPicker } from '@/components/daily/MealPicker'
import {
  RecipeInstanceMacroBar,
  RecipeServingQuantity,
  scaleRecipePreviewMacros,
} from '@/components/daily/RecipeInstanceEditor'
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
  onAdd: (meal?: string, quantity?: number) => void
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
  const [servings, setServings] = useState(1)

  useEffect(() => {
    if (open) {
      setMeal('')
      setServings(1)
    }
  }, [open, meals])

  const totals = useMemo(() => {
    if (!food?.recipeComponents) return null
    const base = computeComponentMacros(foodLibrary, food.recipeComponents)
    return scaleRecipePreviewMacros(base, servings)
  }, [food, foodLibrary, servings])

  if (!food) return null

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
            <span>🍱</span> {food.name}
          </SheetTitle>
        </ScrollSheetHeader>
        <ScrollSheetBody className="space-y-3">
          <RecipeServingQuantity
            quantity={servings}
            onQuantityChange={setServings}
            servingDesc={food.servingDesc}
          />
          {totals && <RecipeInstanceMacroBar macros={totals} />}
          <MealPicker
            label="Meal"
            meals={meals}
            value={meal}
            onChange={setMeal}
            showEmptyHint={false}
          />
        </ScrollSheetBody>
        <ScrollSheetFooter compact>
          <Button
            size="sm"
            className="w-full"
            onClick={() => onAdd(meal || undefined, servings)}
          >
            Add
          </Button>
          <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Customize for today
          </Button>
          <Button size="sm" variant="ghost" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        </ScrollSheetFooter>
      </SheetContent>
    </Sheet>
  )
}