import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { RecipeInstanceMacroBar } from '@/components/daily/RecipeInstanceEditor'
import type { RecipeOverrideState } from '@/components/daily/RecipeInstanceEditor'
import { QuantityInput } from '@/components/daily/QuantityInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { computeComponentMacros } from '@/lib/macros'
import {
  amountEatenFromServings,
  buildScaleLogPayload,
  formatScaleEatenSummary,
  getFoodBaseAmount,
} from '@/lib/scale'
import type { FoodItem } from '@/lib/types'

export function useEditableRecipeComponents(
  open: boolean,
  recipe: FoodItem | null,
  library: FoodItem[],
) {
  const [name, setName] = useState('')
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [overrides, setOverrides] = useState<RecipeOverrideState>({})

  useEffect(() => {
    if (!open || !recipe?.recipeComponents) return
    setName(recipe.name)
    setOrderedIds(recipe.recipeComponents.map((c) => c.foodId))
    const initial: RecipeOverrideState = {}
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
  }, [open, recipe, library])

  const components = useMemo(
    () =>
      orderedIds.map((foodId) => ({
        foodId,
        quantity: overrides[foodId]?.quantity ?? 1,
      })),
    [orderedIds, overrides],
  )

  const previewMacros = useMemo(() => {
    if (components.length === 0) return null
    return computeComponentMacros(library, components)
  }, [components, library])

  const removeIngredient = (foodId: string) => {
    setOrderedIds((prev) => prev.filter((id) => id !== foodId))
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[foodId]
      return next
    })
  }

  const addIngredient = (food: FoodItem, quantity: number, scaleAmountEaten?: number) => {
    if (orderedIds.includes(food.id)) {
      toast.error(`${food.name} is already in this recipe`)
      return false
    }
    setOrderedIds((prev) => [...prev, food.id])
    setOverrides((prev) => ({
      ...prev,
      [food.id]:
        scaleAmountEaten != null
          ? { quantity, scaleAmountEaten }
          : { quantity },
    }))
    return true
  }

  const resetDrafts = () => {
    setName('')
    setOrderedIds([])
    setOverrides({})
  }

  return {
    name,
    setName,
    orderedIds,
    overrides,
    setOverrides,
    components,
    previewMacros,
    removeIngredient,
    addIngredient,
    resetDrafts,
  }
}

export function useNewRecipeComponents(library: FoodItem[]) {
  const [name, setName] = useState('')
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [overrides, setOverrides] = useState<RecipeOverrideState>({})

  const components = useMemo(
    () =>
      orderedIds.map((foodId) => ({
        foodId,
        quantity: overrides[foodId]?.quantity ?? 1,
      })),
    [orderedIds, overrides],
  )

  const previewMacros = useMemo(() => {
    if (components.length === 0) return null
    return computeComponentMacros(library, components)
  }, [components, library])

  const removeIngredient = (foodId: string) => {
    setOrderedIds((prev) => prev.filter((id) => id !== foodId))
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[foodId]
      return next
    })
  }

  const addIngredient = (food: FoodItem, quantity: number, scaleAmountEaten?: number) => {
    if (orderedIds.includes(food.id)) {
      toast.error(`${food.name} is already in this recipe`)
      return false
    }
    setOrderedIds((prev) => [...prev, food.id])
    setOverrides((prev) => ({
      ...prev,
      [food.id]:
        scaleAmountEaten != null
          ? { quantity, scaleAmountEaten }
          : { quantity },
    }))
    return true
  }

  const resetDrafts = () => {
    setName('')
    setOrderedIds([])
    setOverrides({})
  }

  return {
    name,
    setName,
    orderedIds,
    overrides,
    setOverrides,
    components,
    previewMacros,
    removeIngredient,
    addIngredient,
    resetDrafts,
  }
}

interface RecipeIngredientListProps {
  library: FoodItem[]
  orderedIds: string[]
  overrides: RecipeOverrideState
  setOverrides: Dispatch<SetStateAction<RecipeOverrideState>>
  onRemove: (foodId: string) => void
  emptyMessage?: string
}

export function RecipeIngredientList({
  library,
  orderedIds,
  overrides,
  setOverrides,
  onRemove,
  emptyMessage = 'No ingredients yet. Search below to add foods from your library.',
}: RecipeIngredientListProps) {
  if (orderedIds.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {orderedIds.map((foodId) => {
        const food = library.find((f) => f.id === foodId)
        if (!food) {
          return (
            <div key={foodId} className="flex items-center justify-between px-3 py-3">
              <p className="text-sm text-muted-foreground">Unknown ingredient</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => onRemove(foodId)}
                aria-label="Remove ingredient"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        const state = overrides[foodId] ?? { quantity: 1 }
        const eaten =
          state.scaleAmountEaten ??
          (food.scaleType === 'scale'
            ? amountEatenFromServings(getFoodBaseAmount(food), state.quantity)
            : undefined)

        return (
          <div key={foodId} className="px-3 py-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{food.name}</p>
                {food.scaleType === 'scale' && eaten != null && (
                  <p className="text-xs text-muted-foreground">
                    {formatScaleEatenSummary(food, eaten)}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
                onClick={() => onRemove(foodId)}
                aria-label={`Remove ${food.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {food.scaleType === 'scale' ? (
              <QuantityInput
                food={food}
                note=""
                onNoteChange={() => {}}
                showNote={false}
                showInlineMacroPreview={false}
                compact
                amountEaten={eaten ?? getFoodBaseAmount(food)}
                onAmountEatenChange={(amount) => {
                  const payload = buildScaleLogPayload(food, amount)
                  setOverrides((prev) => ({
                    ...prev,
                    [foodId]: {
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
                    [foodId]: { quantity: q },
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

interface RecipeAddIngredientPanelProps {
  library: FoodItem[]
  excludeIds?: Set<string>
  onAdd: (food: FoodItem, quantity: number, scaleAmountEaten?: number) => boolean
}

export function RecipeAddIngredientPanel({
  library,
  excludeIds,
  onAdd,
}: RecipeAddIngredientPanelProps) {
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState<FoodItem | null>(null)
  const [addQty, setAddQty] = useState(1)
  const [addAmountEaten, setAddAmountEaten] = useState(1)

  const searchResults = useMemo(
    () =>
      library
        .filter(
          (f) =>
            !f.isRecipe &&
            !excludeIds?.has(f.id) &&
            f.name.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 20),
    [library, query, excludeIds],
  )

  const resetAddFlow = () => {
    setAdding(null)
    setAddQty(1)
    setQuery('')
  }

  const confirmAdd = () => {
    if (!adding) return
    const qty =
      adding.scaleType === 'scale'
        ? buildScaleLogPayload(adding, addAmountEaten).quantity
        : Math.max(1, Math.round(addQty))
    const scaleAmountEaten =
      adding.scaleType === 'scale' ? addAmountEaten : undefined
    if (onAdd(adding, qty, scaleAmountEaten)) {
      resetAddFlow()
    }
  }

  if (adding) {
    return (
      <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <p className="text-sm font-medium">Add {adding.name}</p>
        <QuantityInput
          food={adding}
          note=""
          onNoteChange={() => {}}
          showNote={false}
          showInlineMacroPreview={false}
          countQuantity={addQty}
          onCountQuantityChange={setAddQty}
          amountEaten={addAmountEaten}
          onAmountEatenChange={setAddAmountEaten}
        />
        <Button className="w-full gap-2" onClick={confirmAdd}>
          <Plus className="h-4 w-4" />
          Add to recipe
        </Button>
        <Button variant="ghost" className="w-full" onClick={resetAddFlow}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Add ingredient from library</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search foods to add..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      {query.trim() && searchResults.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-2">
          No foods match your search.
        </p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {searchResults.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-secondary active:bg-secondary/80"
                onClick={() => {
                  setAdding(f)
                  setAddQty(1)
                  setAddAmountEaten(getFoodBaseAmount(f))
                }}
              >
                {f.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface RecipeMacroSummaryProps {
  macros: ReturnType<typeof computeComponentMacros> | null
}

export function RecipeMacroSummary({ macros }: RecipeMacroSummaryProps) {
  if (!macros) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
        Add ingredients to see recipe totals.
      </p>
    )
  }
  return <RecipeInstanceMacroBar macros={macros} />
}