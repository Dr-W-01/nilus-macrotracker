import { Checkbox } from '@/components/ui/checkbox'
import { EditIconButton } from '@/components/ui/edit-icon-button'
import { LoggedMacroPreview } from '@/components/daily/LoggedMacroPreview'
import { formatLoggedFoodQuantity } from '@/lib/scale'
import { getLoggedFoodMacros, roundMacro } from '@/lib/macros'
import { isConfiguredMeal, resolveLoggedMeal } from '@/lib/meals'
import type { FoodItem, LoggedFood } from '@/lib/types'

interface LoggedFoodEntryRowProps {
  entry: LoggedFood
  food: FoodItem | undefined
  foodLibrary: FoodItem[]
  meals: string[]
  editDayMode: boolean
  selectFoodsMode: boolean
  selected: boolean
  onToggleSelect: () => void
  onOpenEdit: () => void
  onAssignMeal: (meal: string | undefined) => void
}

export function LoggedFoodEntryRow({
  entry,
  food,
  foodLibrary,
  meals,
  editDayMode,
  selectFoodsMode,
  selected,
  onToggleSelect,
  onOpenEdit,
  onAssignMeal,
}: LoggedFoodEntryRowProps) {
  const macros = getLoggedFoodMacros(foodLibrary, entry)
  const entryMeal =
    entry.meal?.trim() && isConfiguredMeal(entry.meal, meals)
      ? resolveLoggedMeal(entry.meal, meals) ?? null
      : null

  return (
    <li>
      <button
        type="button"
        className={`flex w-full flex-col gap-1 rounded-lg border bg-card px-3 py-2.5 text-left ${
          selectFoodsMode && selected
            ? 'border-primary bg-primary/10'
            : 'border-border'
        }`}
        onClick={() => {
          if (!editDayMode) return
          if (selectFoodsMode) {
            onToggleSelect()
            return
          }
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
            {editDayMode && !selectFoodsMode && (
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
        {editDayMode && !selectFoodsMode && (
          <div
            className="flex flex-wrap gap-1 pt-0.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {meals.map((m) => {
              const active =
                entryMeal != null && m.toLowerCase() === entryMeal.toLowerCase()
              return (
                <button
                  key={m}
                  type="button"
                  className={`rounded-full px-2 py-0.5 text-[10px] border min-h-7 ${
                    active
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
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
        )}
        <LoggedMacroPreview macros={macros} size="sm" />
      </button>
    </li>
  )
}