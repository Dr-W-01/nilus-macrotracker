import { useMemo } from 'react'
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
  buildRecipeOverridePayload,
  useRecipeOverrideState,
} from '@/components/daily/RecipeInstanceEditor'
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
  const baseComponents = useMemo(() => {
    if (!recipe?.recipeComponents) return []
    return entry?.overriddenComponents ?? recipe.recipeComponents
  }, [recipe, entry])

  const { overrides, setOverrides, components, previewMacros } = useRecipeOverrideState(
    open,
    recipe,
    library,
    baseComponents,
  )

  if (!entry || !recipe?.recipeComponents) return null

  const handleSave = () => {
    onSave({
      overriddenComponents: buildRecipeOverridePayload(recipe, components),
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalViewport active={open} />
      <SheetContent
        side="bottom"
        className={scrollSheetContentClass}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollSheetHeader>
          <SheetTitle>{recipe.name}</SheetTitle>
          <p className="text-sm text-muted-foreground">Edit today&apos;s portions</p>
        </ScrollSheetHeader>
        <ScrollSheetBody className="space-y-4">
          <RecipeInstanceScopeBanner mode="edit" dateLabel={dateLabel} recipeName={recipe.name} />
          {previewMacros && <RecipeInstanceMacroBar macros={previewMacros} />}
          <RecipeIngredientsEditor
            recipe={recipe}
            library={library}
            overrides={overrides}
            setOverrides={setOverrides}
          />
        </ScrollSheetBody>
        <ScrollSheetFooter>
          <Button size="lg" className="w-full" onClick={handleSave}>
            Save for {dateLabel}
          </Button>
          <Button variant="destructive" size="lg" className="w-full" onClick={onDelete}>
            Remove from day
          </Button>
          <Button variant="ghost" size="lg" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </ScrollSheetFooter>
      </SheetContent>
    </Sheet>
  )
}