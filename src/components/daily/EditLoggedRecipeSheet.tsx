import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { LoggedMacroPreview } from '@/components/daily/LoggedMacroPreview'
import { QuantityInput } from '@/components/daily/QuantityInput'
import { computeComponentMacros } from '@/lib/macros'
import {
  amountEatenFromServings,
  buildScaleLogPayload,
  getFoodBaseAmount,
} from '@/lib/scale'
import type { FoodItem, LoggedFood } from '@/lib/types'

interface EditLoggedRecipeSheetProps {
  open: boolean
  entry: LoggedFood | null
  recipe: FoodItem | null
  library: FoodItem[]
  dateLabel: string
  onClose: () => void
  onSave: (patch: Partial<LoggedFood>) => void
  onDelete: () => void
}

export function EditLoggedRecipeSheet({
  open,
  entry,
  recipe,
  library,
  dateLabel,
  onClose,
  onSave,
  onDelete,
}: EditLoggedRecipeSheetProps) {
  const [overrides, setOverrides] = useState<
    Record<string, { quantity: number; scaleAmountEaten?: number }>
  >({})

  const baseComponents = useMemo(() => {
    if (!recipe?.recipeComponents) return []
    return entry?.overriddenComponents ?? recipe.recipeComponents
  }, [recipe, entry])

  useEffect(() => {
    if (!open || !recipe?.recipeComponents) return
    const initial: Record<string, { quantity: number; scaleAmountEaten?: number }> = {}
    baseComponents.forEach((c) => {
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
  }, [open, recipe, library, baseComponents])

  const previewMacros = useMemo(() => {
    if (!recipe || baseComponents.length === 0) return null
    return computeComponentMacros(
      library,
      baseComponents.map((c) => ({
        foodId: c.foodId,
        quantity: overrides[c.foodId]?.quantity ?? c.quantity,
      })),
    )
  }, [recipe, library, baseComponents, overrides])

  if (!entry || !recipe?.recipeComponents) return null

  const handleSave = () => {
    const components = recipe.recipeComponents!.map((c) => ({
      foodId: c.foodId,
      quantity: overrides[c.foodId]?.quantity ?? c.quantity,
    }))
    const changed =
      JSON.stringify(components) !==
      JSON.stringify(recipe.recipeComponents)
    onSave({
      overriddenComponents: changed ? components : undefined,
    })
    toast.success('Updated this log entry only')
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 py-3 pr-12 text-left">
          <SheetTitle>Edit {recipe.name}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch]">
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90 mb-4">
            Editing <span className="font-semibold">today&apos;s log only</span> for {dateLabel}.
            Library recipe is unchanged — edit the master recipe from Library → Recipes.
          </div>
          {previewMacros && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center mb-4">
              <p className="text-lg font-bold text-primary tabular-nums">
                {Math.round(previewMacros.calories)} cal
              </p>
              <LoggedMacroPreview macros={previewMacros} size="md" className="mt-1" />
            </div>
          )}
          <div className="space-y-5 pb-2">
            {recipe.recipeComponents.map((comp) => {
              const food = library.find((f) => f.id === comp.foodId)
              if (!food) return null
              const state = overrides[comp.foodId] ?? { quantity: comp.quantity }

              if (food.scaleType === 'scale') {
                const eaten =
                  state.scaleAmountEaten ??
                  amountEatenFromServings(getFoodBaseAmount(food), state.quantity)
                return (
                  <div key={comp.foodId}>
                    <p className="text-sm font-medium mb-2">{food.name}</p>
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

              return (
                <div key={comp.foodId}>
                  <p className="text-sm font-medium mb-2">{food.name}</p>
                  <QuantityInput
                    food={food}
                    note=""
                    onNoteChange={() => {}}
                    showNote={false}
                    countQuantity={Math.max(1, Math.round(state.quantity))}
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
        </div>
        <div className="shrink-0 space-y-2 border-t border-border bg-card px-4 py-4 safe-bottom">
          <Button size="lg" className="w-full" onClick={handleSave}>
            Save for {dateLabel}
          </Button>
          <Button variant="destructive" size="lg" className="w-full" onClick={onDelete}>
            Remove from day
          </Button>
          <Button variant="ghost" size="lg" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}