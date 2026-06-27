import { useMemo } from 'react'
import { ChefHat } from 'lucide-react'
import { toast } from 'sonner'
import { toastFoodAdded } from '@/lib/foodToast'
import { Button } from '@/components/ui/button'
import { FormSection } from '@/components/ui/form-section'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ModalViewport,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetHeader,
  scrollSheetContentClass,
} from '@/components/ui/scroll-modal'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  RecipeAddIngredientPanel,
  RecipeIngredientList,
  RecipeMacroSummary,
  useNewRecipeComponents,
} from '@/components/library/RecipeIngredientEditor'
import { useMacroStore } from '@/store/useMacroStore'

interface CreateRecipeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateRecipeSheet({ open, onOpenChange }: CreateRecipeSheetProps) {
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const addFoodItem = useMacroStore((s) => s.addFoodItem)

  const {
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
  } = useNewRecipeComponents(foodLibrary)

  const excludeIds = useMemo(() => new Set(orderedIds), [orderedIds])

  const handleOpenChange = (next: boolean) => {
    if (!next) resetDrafts()
    onOpenChange(next)
  }

  const save = () => {
    if (!name.trim()) {
      toast.error('Recipe name required')
      return
    }
    if (components.length === 0) {
      toast.error('Add at least one ingredient')
      return
    }
    if (!previewMacros) return

    addFoodItem({
      name: name.trim(),
      caloriesPerServing: previewMacros.calories,
      protein: previewMacros.protein,
      carbs: previewMacros.carbs,
      fat: previewMacros.fat,
      fiber: previewMacros.fiber,
      sugars: previewMacros.sugars,
      scaleType: 'count',
      servingDesc: '1 recipe serving',
      categories: ['Recipes'],
      isRecipe: true,
      recipeComponents: components,
    })
    toastFoodAdded(name.trim())
    resetDrafts()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <ModalViewport active={open} onRequestClose={() => onOpenChange(false)} />
      <SheetContent
        side="bottom"
        className={scrollSheetContentClass}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollSheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" aria-hidden />
            Create recipe
          </SheetTitle>
          <p className="text-xs font-normal text-muted-foreground">
            Combine foods from your library into a reusable recipe.
          </p>
        </ScrollSheetHeader>
        <ScrollSheetBody className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="new-recipe-name" className="text-xs font-medium text-muted-foreground">
              Recipe name
            </Label>
            <Input
              id="new-recipe-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My meal..."
            />
          </div>

          <FormSection
            variant="flat"
            title="Recipe totals"
            description="Calculated automatically from ingredients."
          >
            <RecipeMacroSummary macros={previewMacros} />
          </FormSection>

          <FormSection variant="flat" title={`Ingredients (${orderedIds.length})`}>
            <RecipeIngredientList
              library={foodLibrary}
              orderedIds={orderedIds}
              overrides={overrides}
              setOverrides={setOverrides}
              onRemove={removeIngredient}
            />
          </FormSection>

          <FormSection variant="flat" title="Add ingredient">
            <RecipeAddIngredientPanel
              library={foodLibrary}
              excludeIds={excludeIds}
              onAdd={addIngredient}
            />
          </FormSection>
        </ScrollSheetBody>
        <ScrollSheetFooter>
          <Button
            size="lg"
            className="w-full"
            onClick={save}
            disabled={!name.trim() || components.length === 0}
          >
            Save Recipe
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
        </ScrollSheetFooter>
      </SheetContent>
    </Sheet>
  )
}