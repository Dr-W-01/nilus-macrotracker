import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Minus, Plus } from 'lucide-react'
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
import { cn } from '@/lib/utils'

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

export function RecipeServingQuantity({
  quantity,
  onQuantityChange,
  servingDesc,
  compact = false,
}: {
  quantity: number
  onQuantityChange: (q: number) => void
  servingDesc?: string
  compact?: boolean
}) {
  const qty = Math.max(1, Math.round(quantity) || 1)

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {servingDesc && (
        <p
          className={cn(
            'text-center text-muted-foreground',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {servingDesc}
        </p>
      )}
      <div
        className={cn(
          'flex items-center justify-center',
          compact ? 'gap-4' : 'gap-6',
        )}
      >
        <Button
          type="button"
          variant="stepper"
          size="icon"
          className={
            compact
              ? 'h-9 w-9 rounded-full'
              : 'h-14 w-14 rounded-full text-2xl'
          }
          disabled={qty <= 1}
          onClick={() => onQuantityChange(Math.max(1, qty - 1))}
        >
          <Minus className={compact ? 'h-4 w-4' : 'h-6 w-6'} aria-hidden />
        </Button>
        <span
          className={cn(
            'text-center font-bold tabular-nums',
            compact ? 'min-w-[2.5rem] text-2xl' : 'min-w-[4rem] text-5xl',
          )}
        >
          {qty}
        </span>
        <Button
          type="button"
          variant="stepper"
          size="icon"
          className={
            compact
              ? 'h-9 w-9 rounded-full'
              : 'h-14 w-14 rounded-full text-2xl'
          }
          onClick={() => onQuantityChange(qty + 1)}
        >
          <Plus className={compact ? 'h-4 w-4' : 'h-6 w-6'} aria-hidden />
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
  compact = false,
}: {
  macros: ReturnType<typeof computeComponentMacros>
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-primary/30 bg-primary/10 px-3 text-center',
        compact ? 'py-2' : 'py-2.5',
      )}
    >
      <p
        className={cn(
          'font-bold tabular-nums text-primary',
          compact ? 'text-base' : 'text-lg',
        )}
      >
        {Math.round(macros.calories)} cal
      </p>
      <LoggedMacroPreview
        macros={macros}
        size={compact ? 'sm' : 'md'}
        className="mt-0.5"
      />
    </div>
  )
}

export function RecipeIngredientsEditor({
  recipe,
  library,
  overrides,
  setOverrides,
  compact = false,
}: {
  recipe: FoodItem
  library: FoodItem[]
  overrides: RecipeOverrideState
  setOverrides: Dispatch<SetStateAction<RecipeOverrideState>>
  compact?: boolean
}) {
  if (!recipe.recipeComponents) return null

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {recipe.recipeComponents.map((comp) => {
        const food = library.find((f) => f.id === comp.foodId)
        if (!food) return null
        const state = overrides[comp.foodId] ?? { quantity: comp.quantity }

        return (
          <div
            key={comp.foodId}
            className={compact ? 'px-2.5 py-2' : 'px-3 py-3'}
          >
            <p
              className={cn(
                'font-medium',
                compact ? 'mb-1 text-xs' : 'mb-2 text-sm',
              )}
            >
              {food.name}
            </p>
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