import { useEffect, useState } from 'react'
import { MealPicker } from '@/components/daily/MealPicker'
import { Button } from '@/components/ui/button'
import {
  ModalViewport,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetHeader,
  scrollSheetContentClass,
} from '@/components/ui/scroll-modal'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { QuantityInput } from '@/components/daily/QuantityInput'
import {
  amountEatenFromServings,
  buildScaleLogPayload,
  getFoodBaseAmount,
} from '@/lib/scale'
import type { FoodItem } from '@/lib/types'

interface RecipeCustomizeSheetProps {
  open: boolean
  recipe: FoodItem | null
  library: FoodItem[]
  meals: string[]
  onOpenChange: (open: boolean) => void
  onConfirm: (
    meal: string,
    overrides: { foodId: string; quantity: number }[],
  ) => void
  onCancel: () => void
}

export function RecipeCustomizeSheet({
  open,
  recipe,
  library,
  meals,
  onOpenChange,
  onConfirm,
  onCancel,
}: RecipeCustomizeSheetProps) {
  const [overrides, setOverrides] = useState<
    Record<string, { quantity: number; scaleAmountEaten?: number }>
  >({})
  const [meal, setMeal] = useState(meals[0] ?? 'Breakfast')

  useEffect(() => {
    if (!recipe?.recipeComponents || !open) return
    setMeal(meals[0] ?? 'Breakfast')
    const initial: Record<string, { quantity: number; scaleAmountEaten?: number }> =
      {}
    recipe.recipeComponents.forEach((c) => {
      const food = library.find((f) => f.id === c.foodId)
      if (food?.scaleType === 'scale') {
        const base = getFoodBaseAmount(food)
        initial[c.foodId] = {
          quantity: c.quantity,
          scaleAmountEaten: amountEatenFromServings(base, c.quantity),
        }
      } else {
        initial[c.foodId] = { quantity: c.quantity }
      }
    })
    setOverrides(initial)
  }, [recipe, library, open, meals])

  if (!recipe?.recipeComponents) return null

  const handleConfirm = () => {
    onConfirm(
      meal,
      recipe.recipeComponents!.map((c) => ({
        foodId: c.foodId,
        quantity: overrides[c.foodId]?.quantity ?? c.quantity,
      })),
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel()
        onOpenChange(v)
      }}
    >
      <ModalViewport active={open} />
      <SheetContent
        side="bottom"
        className={scrollSheetContentClass}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollSheetHeader>
          <SheetTitle>Customize {recipe.name}</SheetTitle>
        </ScrollSheetHeader>
        <ScrollSheetBody className="space-y-4">
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-muted-foreground">
            Adjust portions for <span className="font-medium text-foreground">this log entry</span> only.
            The library recipe stays unchanged.
          </div>
          <div className="space-y-6">
            {recipe.recipeComponents.map((comp) => {
              const food = library.find((f) => f.id === comp.foodId)
              if (!food) return null
              const state = overrides[comp.foodId] ?? { quantity: comp.quantity }

              if (food.scaleType === 'scale') {
                const eaten =
                  state.scaleAmountEaten ??
                  amountEatenFromServings(getFoodBaseAmount(food), state.quantity)

                return (
                  <div key={comp.foodId} className="border-b border-border pb-4 last:border-0">
                    <p className="font-medium mb-2">{food.name}</p>
                    <QuantityInput
                      food={food}
                      note=""
                      onNoteChange={() => {}}
                      showNote={false}
                      amountEaten={eaten}
                      onAmountEatenChange={(amount) => {
                        const payload = buildScaleLogPayload(food, amount)
                        setOverrides((prev) => ({
                          ...prev,
                          [comp.foodId]: {
                            quantity: payload.quantity,
                            scaleAmountEaten: payload.scaleAmountEaten,
                          },
                        }))
                      }}
                    />
                  </div>
                )
              }

              const countQty = Math.max(1, Math.round(state.quantity))

              return (
                <div key={comp.foodId} className="border-b border-border pb-4 last:border-0">
                  <p className="font-medium mb-2">{food.name}</p>
                  <QuantityInput
                    food={food}
                    note=""
                    onNoteChange={() => {}}
                    showNote={false}
                    countQuantity={countQty}
                    onCountQuantityChange={(q) =>
                      setOverrides((prev) => ({
                        ...prev,
                        [comp.foodId]: { quantity: q },
                      }))
                    }
                  />
                </div>
              )
            })}
          </div>
          <MealPicker
            label="Add to meal"
            meals={meals}
            value={meal}
            onChange={setMeal}
          />
        </ScrollSheetBody>
        <ScrollSheetFooter>
          <Button size="lg" className="w-full" onClick={handleConfirm}>
            Add customized recipe
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        </ScrollSheetFooter>
      </SheetContent>
    </Sheet>
  )
}