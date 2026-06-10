import { useEffect, useMemo, useState } from 'react'
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
import {
  RecipeIngredientsEditor,
  RecipeInstanceMacroBar,
  RecipeInstanceScopeBanner,
  useRecipeOverrideState,
} from '@/components/daily/RecipeInstanceEditor'
import type { FoodItem } from '@/lib/types'

interface RecipeCustomizeSheetProps {
  open: boolean
  recipe: FoodItem | null
  library: FoodItem[]
  meals: string[]
  defaultMeal?: string
  onOpenChange: (open: boolean) => void
  onConfirm: (
    meal: string | undefined,
    overrides: { foodId: string; quantity: number }[],
  ) => void
  onCancel: () => void
}

export function RecipeCustomizeSheet({
  open,
  recipe,
  library,
  meals,
  defaultMeal,
  onOpenChange,
  onConfirm,
  onCancel,
}: RecipeCustomizeSheetProps) {
  const baseComponents = useMemo(
    () => recipe?.recipeComponents ?? [],
    [recipe],
  )

  const { overrides, setOverrides, components, previewMacros } = useRecipeOverrideState(
    open,
    recipe,
    library,
    baseComponents,
  )

  const [meal, setMeal] = useState('')

  useEffect(() => {
    if (!open) return
    setMeal(defaultMeal ?? '')
  }, [open, defaultMeal, meals])

  if (!recipe?.recipeComponents) return null

  const handleConfirm = () => {
    onConfirm(meal || undefined, components)
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
          <SheetTitle>{recipe.name}</SheetTitle>
          <p className="text-sm text-muted-foreground">Customize for today</p>
        </ScrollSheetHeader>
        <ScrollSheetBody className="space-y-4">
          <RecipeInstanceScopeBanner mode="add" recipeName={recipe.name} />
          {previewMacros && <RecipeInstanceMacroBar macros={previewMacros} />}
          <RecipeIngredientsEditor
            recipe={recipe}
            library={library}
            overrides={overrides}
            setOverrides={setOverrides}
          />
          <MealPicker label="Meal" meals={meals} value={meal} onChange={setMeal} />
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