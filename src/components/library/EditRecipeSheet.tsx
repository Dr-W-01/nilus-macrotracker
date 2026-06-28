import { useMemo, useState } from 'react'
import { ChefHat, Info } from 'lucide-react'
import { toast } from 'sonner'
import { toastFoodRemoved, toastFoodUpdated } from '@/lib/foodToast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { FormSection } from '@/components/ui/form-section'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ModalViewport,
  ScrollDialogBody,
  ScrollDialogFooter,
  ScrollDialogHeader,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetHeader,
  scrollDialogContentClass,
  scrollSheetContentClass,
} from '@/components/ui/scroll-modal'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  RecipeAddIngredientPanel,
  RecipeIngredientList,
  RecipeMacroSummary,
  useEditableRecipeComponents,
} from '@/components/library/RecipeIngredientEditor'
import type { FoodItem } from '@/lib/types'

import { useMacroStore } from '@/store/useMacroStore'

interface EditRecipeSheetProps {
  recipe: FoodItem | null
  onClose: () => void
}

export function EditRecipeSheet({ recipe, onClose }: EditRecipeSheetProps) {
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const updateFoodItem = useMacroStore((s) => s.updateFoodItem)
  const deleteFoodItems = useMacroStore((s) => s.deleteFoodItems)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const open = recipe != null
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
  } = useEditableRecipeComponents(open, recipe, foodLibrary)

  const excludeIds = useMemo(() => {
    const ids = new Set(orderedIds)
    if (recipe) ids.add(recipe.id)
    return ids
  }, [orderedIds, recipe])

  if (!recipe) return null

  const save = () => {
    if (!name.trim()) {
      toast.error('Recipe name required')
      return
    }
    if (components.length === 0) {
      toast.error('Add at least one ingredient')
      return
    }
    updateFoodItem(recipe.id, {
      name: name.trim(),
      recipeComponents: components,
      isRecipe: true,
      scaleType: 'count',
      servingDesc: '1 recipe serving',
      categories: recipe.categories.includes('Recipes')
        ? recipe.categories
        : [...recipe.categories, 'Recipes'],
    })
    toastFoodUpdated(name.trim())
    onClose()
  }

  const handleDelete = () => {
    deleteFoodItems([recipe.id])
    toastFoodRemoved(recipe.name)
    setDeleteConfirmOpen(false)
    onClose()
  }

  return (
    <>
      <Sheet open onOpenChange={(v) => !v && onClose()}>
        <ModalViewport active onRequestClose={onClose} />
        <SheetContent
          side="bottom"
          className={scrollSheetContentClass}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScrollSheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" aria-hidden />
              Edit recipe
            </SheetTitle>
            <p className="text-xs font-normal text-muted-foreground">
              Manage ingredients and quantities for this library recipe.
            </p>
          </ScrollSheetHeader>
          <ScrollSheetBody className="space-y-5">
            <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <ChefHat className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>
                You are editing the{' '}
                <span className="font-medium text-foreground">recipe contents</span> in your Library.
                Changes apply everywhere and update total macros automatically. To adjust a single
                day&apos;s log, use the Daily tab.
              </span>
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="recipe-name" className="text-xs font-medium text-muted-foreground">
                Recipe name
              </Label>
              <Input
                id="recipe-name"
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
            <Button size="sm" className="w-full" onClick={save}>
              Save recipe
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="w-full"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete recipe
            </Button>
            <Button size="sm" variant="ghost" className="w-full" onClick={onClose}>
              Cancel
            </Button>
          </ScrollSheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <ModalViewport active={deleteConfirmOpen} onRequestClose={() => setDeleteConfirmOpen(false)} />
        <DialogContent className={scrollDialogContentClass}>
          <ScrollDialogHeader>
            <DialogTitle>Delete {recipe.name}?</DialogTitle>
          </ScrollDialogHeader>
          <ScrollDialogBody className="space-y-3 py-2">
            <div className="flex gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div className="space-y-2 text-sm leading-relaxed">
                <p className="text-foreground">
                  <span className="font-medium">{recipe.name}</span> will be removed from your
                  library.
                </p>
                <p className="text-muted-foreground">
                  Foods already logged on the Daily tab are kept in your history. They may show as
                  &quot;Unknown&quot; until you delete those entries manually.
                </p>
              </div>
            </div>
          </ScrollDialogBody>
          <ScrollDialogFooter>
            <Button variant="destructive" size="lg" className="w-full" onClick={handleDelete}>
              Remove from library
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
          </ScrollDialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}