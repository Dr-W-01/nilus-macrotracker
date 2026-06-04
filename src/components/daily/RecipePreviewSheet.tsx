import { useMemo } from 'react'
import { useEffect, useState } from 'react'
import { MealPicker } from '@/components/daily/MealPicker'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { computeComponentMacros } from '@/lib/macros'
import { roundMacro } from '@/lib/macros'
import type { FoodItem } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'

interface RecipePreviewSheetProps {
  open: boolean
  food: FoodItem | null
  meals: string[]
  onOpenChange: (open: boolean) => void
  onAdd: (meal: string) => void
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
  const [meal, setMeal] = useState(meals[0] ?? 'Breakfast')

  useEffect(() => {
    if (open) setMeal(meals[0] ?? 'Breakfast')
  }, [open, meals])

  const components = useMemo(() => {
    if (!food?.recipeComponents) return []
    return food.recipeComponents.map((c) => {
      const item = foodLibrary.find((f) => f.id === c.foodId)
      return { ...c, item }
    })
  }, [food, foodLibrary])

  const totals = useMemo(() => {
    if (!food?.recipeComponents) return null
    return computeComponentMacros(foodLibrary, food.recipeComponents)
  }, [food, foodLibrary])

  if (!food) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>🍱</span> {food.name}
          </SheetTitle>
        </SheetHeader>
        <p className="text-sm text-muted-foreground mb-4">Standard recipe quantities</p>
        <ul className="space-y-2 mb-4 max-h-[40dvh] overflow-y-auto">
          {components.map((c) => (
            <li
              key={c.foodId}
              className="flex justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span>{c.item?.name ?? 'Unknown'}</span>
              <span className="text-muted-foreground">
                {c.quantity} {c.item?.scaleType === 'scale' ? c.item.unit : '×'}
              </span>
            </li>
          ))}
        </ul>
        {totals && (
          <div className="rounded-lg bg-secondary/50 p-3 text-sm mb-4 grid grid-cols-3 gap-2">
            <div><span className="text-muted-foreground">Cal</span><br />{roundMacro(totals.calories, 0)}</div>
            <div><span className="text-muted-foreground">P</span><br />{roundMacro(totals.protein)}g</div>
            <div><span className="text-muted-foreground">C</span><br />{roundMacro(totals.carbs)}g</div>
            <div><span className="text-muted-foreground">F</span><br />{roundMacro(totals.fat)}g</div>
            <div><span className="text-muted-foreground">Fiber</span><br />{roundMacro(totals.fiber)}g</div>
            <div><span className="text-muted-foreground">Sugar</span><br />{roundMacro(totals.sugars)}g</div>
          </div>
        )}
        <MealPicker
          label="Add to meal"
          meals={meals}
          value={meal}
          onChange={setMeal}
          className="mb-4"
        />
        <div className="flex flex-col gap-2 mt-auto">
          <Button size="lg" onClick={() => onAdd(meal)}>Add</Button>
          <Button size="lg" variant="outline" onClick={onEdit}>Edit</Button>
          <Button size="lg" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}