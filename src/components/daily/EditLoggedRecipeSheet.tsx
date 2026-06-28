import { useEffect, useMemo, useState } from 'react'
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
  RecipeServingQuantity,
  buildRecipeOverridePayload,
  scaleRecipePreviewMacros,
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
  const [servings, setServings] = useState(1)

  useEffect(() => {
    if (!open || !entry) return
    setServings(Math.max(1, Math.round(entry.quantity) || 1))
  }, [open, entry])

  if (!entry || !recipe?.recipeComponents) return null

  const scaledMacros = previewMacros
    ? scaleRecipePreviewMacros(previewMacros, servings)
    : null

  const handleSave = () => {
    onSave({
      quantity: Math.max(1, Math.round(servings)),
      overriddenComponents: buildRecipeOverridePayload(recipe, components),
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalViewport active={open} onRequestClose={onClose} />
      <SheetContent
        side="bottom"
        className={scrollSheetContentClass}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollSheetHeader className="py-3">
          <SheetTitle className="text-base">{recipe.name}</SheetTitle>
          <p className="text-xs font-normal text-muted-foreground">{dateLabel}</p>
        </ScrollSheetHeader>
        <ScrollSheetBody className="space-y-2 py-3">
          <RecipeServingQuantity
            compact
            quantity={servings}
            onQuantityChange={setServings}
            servingDesc={recipe.servingDesc}
          />
          {scaledMacros && <RecipeInstanceMacroBar compact macros={scaledMacros} />}
          <RecipeIngredientsEditor
            compact
            recipe={recipe}
            library={library}
            overrides={overrides}
            setOverrides={setOverrides}
          />
        </ScrollSheetBody>
        <ScrollSheetFooter>
          <Button size="sm" className="w-full" onClick={handleSave}>
            Save for {dateLabel}
          </Button>
          <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
            Remove from day
          </Button>
          <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </ScrollSheetFooter>
      </SheetContent>
    </Sheet>
  )
}