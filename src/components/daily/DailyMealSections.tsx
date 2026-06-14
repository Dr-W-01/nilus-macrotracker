import { ChevronDown, ChevronUp } from 'lucide-react'
import { LoggedFoodEntryRow } from '@/components/daily/LoggedFoodEntryRow'
import { LoggedMacroPreview } from '@/components/daily/LoggedMacroPreview'
import { computeDayMacros, formatMealGroupTotals, roundMacro } from '@/lib/macros'
import type { FoodItem, LoggedFood } from '@/lib/types'
import { SURFACE_GRADIENT_COMPACT } from '@/lib/surfaceStyles'
import { cn } from '@/lib/utils'
import { useMacroStore } from '@/store/useMacroStore'

interface MealSection {
  meal: string
  entries: LoggedFood[]
  totals: ReturnType<typeof computeDayMacros>
}

interface DailyMealSectionsProps {
  sections: MealSection[]
  allMeals: string[]
  editDayMode: boolean
  currentDate: string
  foodLibrary: FoodItem[]
  meals: string[]
  collapsedMeals: Set<string>
  selectFoodsMode: boolean
  selectedLogIds: Set<string>
  onToggleSelect: (id: string) => void
  onOpenEdit: (entry: LoggedFood, isRecipe: boolean) => void
  onAssignMeal: (entryId: string, meal: string | undefined) => void
}

export function DailyMealSections({
  sections,
  allMeals,
  editDayMode,
  currentDate,
  foodLibrary,
  meals,
  collapsedMeals,
  selectFoodsMode,
  selectedLogIds,
  onToggleSelect,
  onOpenEdit,
  onAssignMeal,
}: DailyMealSectionsProps) {
  const toggleMealCollapsed = useMacroStore((s) => s.toggleMealCollapsed)

  const sectionByMeal = new Map(sections.map((s) => [s.meal.toLowerCase(), s]))
  const displayMeals = editDayMode
    ? allMeals
    : sections.map((s) => s.meal)

  if (displayMeals.length === 0) return null

  return (
    <div className={cn('space-y-2', editDayMode && 'space-y-1.5')}>
      {displayMeals.map((meal) => {
        const section = sectionByMeal.get(meal.toLowerCase())
        const entries = section?.entries ?? []
        const totals = section?.totals
        const mealExpanded = !collapsedMeals.has(meal)

        return (
          <section
            key={meal}
            className={cn(SURFACE_GRADIENT_COMPACT, 'transition-shadow')}
          >
            <div className="flex min-h-9 items-center gap-1 px-0.5 py-0.5">
              <button
                type="button"
                className={cn(
                  'mb-0 flex min-h-9 w-full min-w-0 flex-1 gap-2 rounded-lg px-0.5 py-1 text-left transition-colors active:bg-secondary/50',
                  'items-start',
                )}
                onClick={() => toggleMealCollapsed(meal, currentDate)}
                aria-expanded={mealExpanded}
                aria-controls={`meal-foods-${meal.replace(/\s+/g, '-')}`}
              >
                <span className="mt-0.5 shrink-0 text-primary">
                  {mealExpanded ? (
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  {mealExpanded ? (
                    <span className="space-y-0.5">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
                        {meal}
                        <span className="sr-only">, expanded</span>
                      </span>
                      {totals && entries.length > 0 && (
                        <span className="block text-[10px] text-muted-foreground tabular-nums leading-snug">
                          {formatMealGroupTotals(totals)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="block min-w-0 space-y-0.5">
                      <span className="block whitespace-nowrap text-xs font-semibold uppercase tracking-wide">
                        <span className="text-primary">{meal}</span>
                        <span className="text-foreground">
                          {' '}
                          ({roundMacro(totals?.calories ?? 0, 0)} CAL)
                        </span>
                        <span className="sr-only">, collapsed</span>
                      </span>
                      {totals && entries.length > 0 && (
                        <LoggedMacroPreview
                          macros={totals}
                          size="xs"
                          nowrap
                          className="block overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        />
                      )}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                  {entries.length} {entries.length === 1 ? 'item' : 'items'}
                </span>
              </button>
            </div>
            {mealExpanded && entries.length > 0 && (
              <ul
                id={`meal-foods-${meal.replace(/\s+/g, '-')}`}
                className="space-y-1.5 border-t border-border/50 px-1 pb-1 pt-0.5"
              >
                {entries.map((entry) => {
                  const food = foodLibrary.find((f) => f.id === entry.foodId)
                  return (
                    <LoggedFoodEntryRow
                      key={entry.id}
                      entry={entry}
                      food={food}
                      foodLibrary={foodLibrary}
                      meals={meals}
                      editDayMode={editDayMode}
                      selectFoodsMode={selectFoodsMode}
                      selected={selectedLogIds.has(entry.id)}
                      onToggleSelect={() => onToggleSelect(entry.id)}
                      onOpenEdit={() => onOpenEdit(entry, !!food?.isRecipe)}
                      onAssignMeal={(m) => onAssignMeal(entry.id, m)}
                    />
                  )
                })}
              </ul>
            )}
            {mealExpanded && entries.length === 0 && editDayMode && (
              <p className="border-t border-border/50 px-2 py-1 text-xs text-muted-foreground">
                No items
              </p>
            )}
          </section>
        )
      })}
    </div>
  )
}