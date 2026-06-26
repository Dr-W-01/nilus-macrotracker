import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { BookOpen, CalendarDays, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoggedMacroPreview } from '@/components/daily/LoggedMacroPreview'
import { QuantityInput } from '@/components/daily/QuantityInput'
import { computeComponentMacros, scaleMacroTotals } from '@/lib/macros'
import {
  amountEatenFromServings,
  buildScaleLogPayload,
  getFoodBaseAmount,
} from '@/lib/scale'
import type { FoodItem } from '@/lib/types'

export type RecipeOverrideState = Record<
  string,
  { quantity: number; scaleAmountEaten?: number }
>

export function useRecipeOverrideState(
  open: boolean,
  recipe: FoodItem | null,
  library: FoodItem[],
  baseComponents: { foodId: string; quantity: number }[],
) {
  const [overrides, setOverrides] = useState<RecipeOverrideState>({})

  useEffect(() => {
    if (!open || !recipe?.recipeComponents) return
    const initial: RecipeOverrideState = {}
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

  const components = useMemo(() => {
    if (!recipe?.recipeComponents) return []
    return recipe.recipeComponents.map((c) => ({
      foodId: c.foodId,
      quantity: overrides[c.foodId]?.quantity ?? c.quantity,
    }))
  }, [recipe, overrides])

  const previewMacros = useMemo(() => {
    if (!recipe || components.length === 0) return null
    return computeComponentMacros(library, components)
  }, [recipe, library, components])

  return { overrides, setOverrides, components, previewMacros }
}

export function RecipeInstanceScopeBanner({
  mode,
  dateLabel,
  recipeName,
}: {
  mode: 'add' | 'edit'
  dateLabel?: string
  recipeName: string
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 space-y-1 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Today&apos;s entry</span>
          {mode === 'edit' && dateLabel ? ` · ${dateLabel}` : ''} — adjust portions for{' '}
          <span className="font-medium text-foreground">{recipeName}</span> on this day only.
        </p>
        <p className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Library recipe unchanged. Edit the master recipe under Library → Recipes.
        </p>
      </div>
    </div>
  )
}

export function RecipeServingQuantity({
  quantity,
  onQuantityChange,
  servingDesc,
}: {
  quantity: number
  onQuantityChange: (q: number) => void
  servingDesc?: string
}) {
  const qty = Math.max(1, Math.round(quantity) || 1)

  return (
    <div className="space-y-2">
      {servingDesc && (
        <p className="text-center text-sm text-muted-foreground">{servingDesc}</p>
      )}
      <div className="flex items-center justify-center gap-6">
        <Button
          type="button"
          variant="stepper"
          size="icon"
          className="h-14 w-14 rounded-full text-2xl"
          disabled={qty <= 1}
          onClick={() => onQuantityChange(Math.max(1, qty - 1))}
        >
          <Minus className="h-6 w-6" aria-hidden />
        </Button>
        <span className="min-w-[4rem] text-center text-5xl font-bold tabular-nums">
          {qty}
        </span>
        <Button
          type="button"
          variant="stepper"
          size="icon"
          className="h-14 w-14 rounded-full text-2xl"
          onClick={() => onQuantityChange(qty + 1)}
        >
          <Plus className="h-6 w-6" aria-hidden />
        </Button>
      </div>
    </div>
  )
}

export function scaleRecipePreviewMacros(
  macros: ReturnType<typeof computeComponentMacros>,
  servings: number,
) {
  return scaleMacroTotals(macros, Math.max(1, Math.round(servings) || 1))
}

export function RecipeInstanceMacroBar({
  macros,
}: {
  macros: ReturnType<typeof computeComponentMacros>
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-center">
      <p className="text-lg font-bold tabular-nums text-primary">
        {Math.round(macros.calories)} cal
      </p>
      <LoggedMacroPreview macros={macros} size="md" className="mt-1" />
    </div>
  )
}

export function RecipeIngredientsEditor({
  recipe,
  library,
  overrides,
  setOverrides,
}: {
  recipe: FoodItem
  library: FoodItem[]
  overrides: RecipeOverrideState
  setOverrides: Dispatch<SetStateAction<RecipeOverrideState>>
}) {
  if (!recipe.recipeComponents) return null

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {recipe.recipeComponents.map((comp) => {
        const food = library.find((f) => f.id === comp.foodId)
        if (!food) return null
        const state = overrides[comp.foodId] ?? { quantity: comp.quantity }

        return (
          <div key={comp.foodId} className="px-3 py-3">
            <p className="mb-2 text-sm font-medium">{food.name}</p>
            {food.scaleType === 'scale' ? (
              <QuantityInput
                food={food}
                note=""
                onNoteChange={() => {}}
                showNote={false}
                showInlineMacroPreview={false}
                compact
                amountEaten={
                  state.scaleAmountEaten ??
                  amountEatenFromServings(getFoodBaseAmount(food), state.quantity)
                }
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
            ) : (
              <QuantityInput
                food={food}
                note=""
                onNoteChange={() => {}}
                showNote={false}
                showInlineMacroPreview={false}
                compact
                countQuantity={Math.max(1, Math.round(state.quantity))}
                onCountQuantityChange={(q) =>
                  setOverrides((prev) => ({
                    ...prev,
                    [comp.foodId]: { quantity: q },
                  }))
                }
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function buildRecipeOverridePayload(
  recipe: FoodItem,
  components: { foodId: string; quantity: number }[],
): { foodId: string; quantity: number }[] | undefined {
  if (!recipe.recipeComponents) return undefined
  const changed =
    JSON.stringify(components) !== JSON.stringify(recipe.recipeComponents)
  return changed ? components : undefined
}