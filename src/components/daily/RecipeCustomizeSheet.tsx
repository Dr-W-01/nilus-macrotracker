import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { QuantityInput } from '@/components/daily/QuantityInput'
import { computeComponentMacros, emptyMacros, roundMacro, scaleMacros } from '@/lib/macros'
import type { FoodItem } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'

interface RecipeCustomizeSheetProps {
  open: boolean
  food: FoodItem | null
  onOpenChange: (open: boolean) => void
  onAddToDay: (overrides: { foodId: string; quantity: number }[]) => void
  onCancel: () => void
}

export function RecipeCustomizeSheet({
  open,
  food,
  onOpenChange,
  onAddToDay,
  onCancel,
}: RecipeCustomizeSheetProps) {
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!food?.recipeComponents) return
    const init: Record<string, number> = {}
    food.recipeComponents.forEach((c) => {
      init[c.foodId] = c.quantity
    })
    setQuantities(init)
  }, [food])

  const components = useMemo(() => {
    if (!food?.recipeComponents) return []
    return food.recipeComponents.map((c) => ({
      ...c,
      item: foodLibrary.find((f) => f.id === c.foodId),
    }))
  }, [food, foodLibrary])

  const totals = useMemo(() => {
    if (!food?.recipeComponents) return emptyMacros()
    const comps = food.recipeComponents.map((c) => ({
      foodId: c.foodId,
      quantity: quantities[c.foodId] ?? c.quantity,
    }))
    return computeComponentMacros(foodLibrary, comps)
  }, [food, foodLibrary, quantities])

  if (!food) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize {food.name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 py-2">
          {components.map((c) => {
            const item = c.item
            if (!item) return null
            const qty = quantities[c.foodId] ?? c.quantity
            return (
              <div key={c.foodId} className="rounded-xl border border-border p-4">
                <h4 className="font-medium mb-3">{item.name}</h4>
                <QuantityInput
                  food={item}
                  quantity={qty}
                  note=""
                  onQuantityChange={(q) =>
                    setQuantities((prev) => ({ ...prev, [c.foodId]: q }))
                  }
                  onNoteChange={() => {}}
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {roundMacro(scaleMacros(item, qty).calories, 0)} cal from this item
                </p>
              </div>
            )
          })}
        </div>
        <div className="rounded-lg bg-primary/20 border border-primary/40 p-3 grid grid-cols-3 gap-2 text-sm mb-4">
          <div><span className="text-muted-foreground">Total Cal</span><br />{roundMacro(totals.calories, 0)}</div>
          <div><span className="text-muted-foreground">Protein</span><br />{roundMacro(totals.protein)}g</div>
          <div><span className="text-muted-foreground">Carbs</span><br />{roundMacro(totals.carbs)}g</div>
          <div><span className="text-muted-foreground">Fat</span><br />{roundMacro(totals.fat)}g</div>
          <div><span className="text-muted-foreground">Fiber</span><br />{roundMacro(totals.fiber)}g</div>
          <div><span className="text-muted-foreground">Sugars</span><br />{roundMacro(totals.sugars)}g</div>
        </div>
        <div className="flex flex-col gap-2 sticky bottom-0 bg-card pt-2">
          <Button
            size="lg"
            onClick={() => {
              const overrides = Object.entries(quantities).map(([foodId, quantity]) => ({
                foodId,
                quantity,
              }))
              onAddToDay(overrides)
            }}
          >
            Add to day
          </Button>
          <Button size="lg" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}