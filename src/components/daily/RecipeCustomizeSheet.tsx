import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
  onOpenChange: (open: boolean) => void
  onConfirm: (overrides: { foodId: string; quantity: number }[]) => void
  onCancel: () => void
}

export function RecipeCustomizeSheet({
  open,
  recipe,
  library,
  onOpenChange,
  onConfirm,
  onCancel,
}: RecipeCustomizeSheetProps) {
  const [overrides, setOverrides] = useState<
    Record<string, { quantity: number; scaleAmountEaten?: number }>
  >({})

  useEffect(() => {
    if (!recipe?.recipeComponents || !open) return
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
  }, [recipe, library, open])

  if (!recipe?.recipeComponents) return null

  const handleConfirm = () => {
    onConfirm(
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
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize {recipe.name}</SheetTitle>
        </SheetHeader>
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-muted-foreground">
          Adjust portions for <span className="font-medium text-foreground">this log entry</span> only.
          The library recipe stays unchanged.
        </div>
        <div className="space-y-6 py-4">
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
        <Button size="lg" className="w-full" onClick={handleConfirm}>
          Add customized recipe
        </Button>
        <Button size="lg" variant="ghost" className="w-full mt-2" onClick={onCancel}>
          Cancel
        </Button>
      </SheetContent>
    </Sheet>
  )
}