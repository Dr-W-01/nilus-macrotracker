import { Checkbox } from '@/components/ui/checkbox'
import { EditIconButton } from '@/components/ui/edit-icon-button'
import { LoggedMacroPreview } from '@/components/daily/LoggedMacroPreview'
import { formatLoggedFoodQuantity } from '@/lib/scale'
import { getLoggedFoodMacros, roundMacro } from '@/lib/macros'
import { isConfiguredMeal, resolveLoggedMeal } from '@/lib/meals'
import type { FoodItem, LoggedFood } from '@/lib/types'
import { SURFACE_INNER } from '@/lib/surfaceStyles'
import { cn } from '@/lib/utils'

interface LoggedFoodEntryRowProps {
  entry: LoggedFood
  food: FoodItem | undefined
  foodLibrary: FoodItem[]
  meals: string[]
  selectFoodsMode: boolean
  selected: boolean
  isUncategorized?: boolean
  onToggleSelect: () => void
  onOpenEdit: () => void
  onAssignMeal: (meal: string | undefined) => void
}

export function LoggedFoodEntryRow({
  entry,
  food,
  foodLibrary,
  meals,
  selectFoodsMode,
  selected,
  isUncategorized = false,
  onToggleSelect,
  onOpenEdit,
  onAssignMeal,
}: LoggedFoodEntryRowProps) {
  const macros = getLoggedFoodMacros(foodLibrary, entry)
  const entryMeal =
    entry.meal?.trim() && isConfiguredMeal(entry.meal, meals)
      ? resolveLoggedMeal(entry.meal, meals) ?? null
      : null

  const showMealAssign = !selectFoodsMode && meals.length > 0
  const quickAssignOnly = isUncategorized && showMealAssign

  return (
    <li>
      <div
        className={cn(
          'flex w-full flex-col gap-1.5 px-3 py-2.5',
          SURFACE_INNER,
          selectFoodsMode && selected && 'border-primary bg-primary/10',
          isUncategorized && 'border-dashed border-primary/35',
        )}
      >
        <button
          type="button"
          className="flex w-full flex-col gap-1 text-left"
          onClick={() => {
            if (selectFoodsMode) {
              onToggleSelect()
              return
            }
            if (quickAssignOnly) return
            onOpenEdit()
          }}
        >
          <div className="flex w-full items-start justify-between gap-2">
            {selectFoodsMode && (
              <Checkbox
                checked={selected}
                onChange={onToggleSelect}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">
                {food?.name ?? 'Unknown'}
                {food?.isRecipe && ' 🍱'}
              </p>
              <p className="text-xs text-muted-foreground">
                {entry.overriddenComponents
                  ? 'Customized for this day'
                  : food
                    ? formatLoggedFoodQuantity(food, entry)
                    : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="text-sm font-medium">
                {roundMacro(macros.calories, 0)} cal
              </span>
              {!selectFoodsMode && (
                <EditIconButton
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  label={`Edit ${food?.name ?? 'entry'}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenEdit()
                  }}
                />
              )}
            </div>
          </div>
          {!quickAssignOnly && <LoggedMacroPreview macros={macros} size="sm" />}
        </button>

        {showMealAssign && (
          <div className="space-y-1 border-t border-border/60 pt-1.5">
            {isUncategorized && (
              <p className="text-[10px] font-medium uppercase tracking-wide text-primary">
                Tap a meal to assign
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {meals.map((m) => {
                const active =
                  entryMeal != null && m.toLowerCase() === entryMeal.toLowerCase()
                return (
                  <button
                    key={m}
                    type="button"
                    className={cn(
                      'rounded-full border font-medium transition-colors min-h-9',
                      isUncategorized ? 'px-3 py-1.5 text-xs' : 'px-2 py-0.5 text-[10px] min-h-7',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-interactive-border bg-interactive-surface text-foreground hover:bg-secondary',
                    )}
                    onClick={() => {
                      if (active) onAssignMeal(undefined)
                      else onAssignMeal(m)
                    }}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </li>
  )
}