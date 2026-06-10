import { useCallback, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { LoggedFoodEntryRow } from '@/components/daily/LoggedFoodEntryRow'
import { computeDayMacros, formatMealGroupTotals } from '@/lib/macros'
import type { FoodItem, LoggedFood } from '@/lib/types'
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
  const reorderMeals = useMacroStore((s) => s.reorderMeals)

  const sectionByMeal = new Map(sections.map((s) => [s.meal.toLowerCase(), s]))
  const displayMeals = editDayMode
    ? allMeals
    : sections.map((s) => s.meal)

  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const rowRefs = useRef<Map<number, HTMLElement>>(new Map())

  const finishDrag = useCallback(
    (from: number | null, to: number | null) => {
      if (from !== null && to !== null && from !== to) {
        reorderMeals(from, to)
      }
      setDragFrom(null)
      setDragOver(null)
    },
    [reorderMeals],
  )

  const resolveDropIndex = (clientY: number): number | null => {
    for (const [index, el] of rowRefs.current.entries()) {
      const rect = el.getBoundingClientRect()
      if (clientY >= rect.top && clientY <= rect.bottom) return index
    }
    return null
  }

  const onGripPointerDown = (index: number) => (e: React.PointerEvent) => {
    if (!editDayMode) return
    e.preventDefault()
    e.stopPropagation()
    setDragFrom(index)
    setDragOver(index)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    const onMove = (ev: PointerEvent) => {
      setDragOver(resolveDropIndex(ev.clientY))
    }
    const onUp = (ev: PointerEvent) => {
      const to = resolveDropIndex(ev.clientY)
      finishDrag(index, to ?? index)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const onDragStart = (index: number) => (e: React.DragEvent) => {
    if (!editDayMode) return
    setDragFrom(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const onDragOver = (index: number) => (e: React.DragEvent) => {
    if (!editDayMode || dragFrom === null) return
    e.preventDefault()
    setDragOver(index)
  }

  const onDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault()
    finishDrag(dragFrom, index)
  }

  const onDragEnd = () => {
    setDragFrom(null)
    setDragOver(null)
  }

  if (displayMeals.length === 0) return null

  return (
    <div className={cn('space-y-1.5', editDayMode && 'space-y-1')}>
      {displayMeals.map((meal, index) => {
        const section = sectionByMeal.get(meal.toLowerCase())
        const entries = section?.entries ?? []
        const totals = section?.totals
        const mealExpanded = !collapsedMeals.has(meal)
        const isDragging = dragFrom === index
        const isDropTarget = dragOver === index && dragFrom !== null && dragFrom !== index

        return (
          <section
            key={meal}
            ref={(el) => {
              if (el) rowRefs.current.set(index, el)
              else rowRefs.current.delete(index)
            }}
            className={cn(
              'rounded-md border border-border/70 bg-card/40 transition-shadow',
              isDragging && 'opacity-60',
              isDropTarget && 'ring-2 ring-primary/40',
            )}
            onDragOver={onDragOver(index)}
            onDrop={onDrop(index)}
          >
            <div className="flex min-h-8 items-center gap-0.5 px-0.5 py-0.5">
              {editDayMode && (
                <button
                  type="button"
                  className="flex h-8 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground active:cursor-grabbing"
                  aria-label={`Drag to reorder ${meal}`}
                  draggable
                  onDragStart={onDragStart(index)}
                  onDragEnd={onDragEnd}
                  onPointerDown={onGripPointerDown(index)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 text-left transition-colors active:bg-secondary/50"
                onClick={() => toggleMealCollapsed(meal, currentDate)}
                aria-expanded={mealExpanded}
                aria-controls={`meal-foods-${meal.replace(/\s+/g, '-')}`}
              >
                <span className="shrink-0 text-primary">
                  {mealExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-primary leading-tight">
                    {meal}
                  </span>
                  {totals && entries.length > 0 && (
                    <span className="block truncate text-[9px] text-muted-foreground tabular-nums leading-tight">
                      {formatMealGroupTotals(totals)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[9px] text-muted-foreground tabular-nums">
                  {entries.length}
                </span>
              </button>
            </div>
            {mealExpanded && entries.length > 0 && (
              <ul
                id={`meal-foods-${meal.replace(/\s+/g, '-')}`}
                className="space-y-1 border-t border-border/50 px-1 pb-1 pt-0.5"
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
              <p className="border-t border-border/50 px-2 py-1 text-[10px] text-muted-foreground">
                No items
              </p>
            )}
          </section>
        )
      })}
    </div>
  )
}