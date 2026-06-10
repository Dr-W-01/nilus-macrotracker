import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Flame,
  Copy,
  Plus,
  Scale,
  UtensilsCrossed,
} from 'lucide-react'
import { toast } from 'sonner'
import { AddFoodSheet } from '@/components/daily/AddFoodSheet'
import { EditLoggedRecipeSheet } from '@/components/daily/EditLoggedRecipeSheet'
import { FoodPickerSheet } from '@/components/daily/FoodPickerSheet'
import { BulkMealAssignBar } from '@/components/daily/BulkMealAssignBar'
import { DailyMealSections } from '@/components/daily/DailyMealSections'
import { LoggedFoodEntryRow } from '@/components/daily/LoggedFoodEntryRow'
import { MealPicker } from '@/components/daily/MealPicker'

import { RecipeCustomizeSheet } from '@/components/daily/RecipeCustomizeSheet'
import { RecipePreviewSheet } from '@/components/daily/RecipePreviewSheet'
import { QuantityInput } from '@/components/daily/QuantityInput'
import { Button } from '@/components/ui/button'
import { EditIconButton } from '@/components/ui/edit-icon-button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  ModalViewport,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetHeader,
  scrollSheetContentClass,
} from '@/components/ui/scroll-modal'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { formatDisplayDate, shiftDate } from '@/lib/dates'
import {
  formatWeight,
  parseWeightInput,
  weightFromKg,
  weightUnitLabel,
} from '@/lib/weight'
import {
  amountEatenFromServings,
  buildScaleLogPayload,
  getFoodBaseAmount,
  servingsFromAmountEaten,
} from '@/lib/scale'
import { LoggedMacroPreview } from '@/components/daily/LoggedMacroPreview'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  computeDayMacros,
  roundMacro,
  scaleMacros,
} from '@/lib/macros'
import {
  isConfiguredMeal,
  mealSortIndex,
  normalizeMealName,
  normalizeMeals,
  resolveLoggedMeal,
} from '@/lib/meals'
import type { FoodItem, LoggedFood } from '@/lib/types'
import { MACRO_DISPLAY_LABELS, MACRO_NUTRIENT_ORDER } from '@/lib/macroColors'
import { mobileFriendlyInputProps } from '@/lib/mobileInput'
import { cn } from '@/lib/utils'
import { useMacroStore } from '@/store/useMacroStore'

const METRICS = [
  { key: 'calories', label: 'Calories', unit: '' },
  ...MACRO_NUTRIENT_ORDER.map((key) => ({
    key,
    label: MACRO_DISPLAY_LABELS[key],
    unit: 'g',
  })),
] as const

const NO_COLLAPSED_MEALS: string[] = []

export function DailyTab() {
  const currentDate = useMacroStore((s) => s.currentDate)
  const setCurrentDate = useMacroStore((s) => s.setCurrentDate)
  const editDayMode = useMacroStore((s) => s.editDayMode)
  const setEditDayMode = useMacroStore((s) => s.setEditDayMode)
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const settings = useMacroStore((s) => s.settings)
  const getDailyLog = useMacroStore((s) => s.getDailyLog)
  const addLoggedFood = useMacroStore((s) => s.addLoggedFood)
  const updateLoggedFood = useMacroStore((s) => s.updateLoggedFood)
  const bulkUpdateLoggedFoodMeal = useMacroStore((s) => s.bulkUpdateLoggedFoodMeal)
  const removeLoggedFood = useMacroStore((s) => s.removeLoggedFood)
  const setBurnedCalories = useMacroStore((s) => s.setBurnedCalories)
  const setDailyWeight = useMacroStore((s) => s.setDailyWeight)
  const setDailyNote = useMacroStore((s) => s.setDailyNote)
  const collapsedMealNames = useMacroStore(
    (s) => s.mealCollapseByDate[s.currentDate] ?? NO_COLLAPSED_MEALS,
  )
  const updateDailyLog = useMacroStore((s) => s.updateDailyLog)
  const duplicatePreviousDayLog = useMacroStore((s) => s.duplicatePreviousDayLog)

  const log = getDailyLog(currentDate)
  const templates = settings?.goalTemplates ?? []
  const goal =
    templates.find((g) => g.id === log.goalTemplateId) ??
    templates.find((g) => g.id === settings?.defaultTemplateId) ??
    templates[0]

  const activeTemplateId = log.goalTemplateId || settings?.defaultTemplateId || 'default'

  const consumed = useMemo(
    () => computeDayMacros(foodLibrary, log.foods),
    [foodLibrary, log.foods],
  )

  const netCalories = consumed.calories - log.burnedCalories

  const [pickerOpen, setPickerOpen] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [editLogged, setEditLogged] = useState<LoggedFood | null>(null)
  const [editRecipeLogged, setEditRecipeLogged] = useState<LoggedFood | null>(null)

  const meals = useMemo(
    () => normalizeMeals(settings?.meals),
    [settings?.meals],
  )
  const [selectFoodsMode, setSelectFoodsMode] = useState(false)
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set())
  const [bulkAssignMeal, setBulkAssignMeal] = useState(meals[0] ?? 'Breakfast')
  const collapsedMeals = useMemo(
    () => new Set(collapsedMealNames),
    [collapsedMealNames],
  )

  useEffect(() => {
    setBulkAssignMeal(meals[0] ?? 'Breakfast')
  }, [meals])

  useEffect(() => {
    setSelectFoodsMode(false)
    setSelectedLogIds(new Set())
  }, [currentDate, editDayMode])

  const { unassignedFoods, foodsByMeal } = useMemo(() => {
    const unassigned: LoggedFood[] = []
    const groups = new Map<string, LoggedFood[]>()
    for (const entry of log.foods) {
      if (!entry.meal?.trim() || !isConfiguredMeal(entry.meal, meals)) {
        unassigned.push(entry)
        continue
      }
      const meal = resolveLoggedMeal(entry.meal, meals)!
      const list = groups.get(meal) ?? []
      list.push(entry)
      groups.set(meal, list)
    }
    const mealOrder = [...meals]
    for (const key of groups.keys()) {
      if (!mealOrder.some((m) => m.toLowerCase() === key.toLowerCase())) {
        mealOrder.push(key)
      }
    }
    mealOrder.sort((a, b) => mealSortIndex(a, meals) - mealSortIndex(b, meals))
    const byMeal = mealOrder
      .filter((meal) => (groups.get(meal)?.length ?? 0) > 0)
      .map((meal) => {
        const entries = groups.get(meal)!
        return {
          meal,
          entries,
          totals: computeDayMacros(foodLibrary, entries),
        }
      })
    return { unassignedFoods: unassigned, foodsByMeal: byMeal }
  }, [log.foods, meals, foodLibrary])
  const [noteExpanded, setNoteExpanded] = useState(!!log.note)
  const [burnEditOpen, setBurnEditOpen] = useState(false)
  const [burnInput, setBurnInput] = useState(String(log.burnedCalories))
  const [weightEditOpen, setWeightEditOpen] = useState(false)
  const weightUnit = settings?.weightUnit ?? 'lbs'
  const weightDisplay =
    log.weightKg != null
      ? formatWeight(log.weightKg, weightUnit)
      : null
  const [weightInput, setWeightInput] = useState(
    log.weightKg != null ? String(weightFromKg(log.weightKg, weightUnit)) : '',
  )

  const handleSelectFood = (food: FoodItem) => {
    setPickerOpen(false)
    setSelectedFood(food)
    if (food.isRecipe) {
      setPreviewOpen(true)
    } else {
      setAddSheetOpen(true)
    }
  }

  const resetFoodFlow = () => {
    setSelectedFood(null)
    setAddSheetOpen(false)
    setPreviewOpen(false)
    setCustomizeOpen(false)
  }

  const toggleLogSelection = (id: string) => {
    setSelectedLogIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exitSelectMode = () => {
    setSelectFoodsMode(false)
    setSelectedLogIds(new Set())
  }

  const handleBulkAssignMeal = () => {
    if (selectedLogIds.size === 0) return
    bulkUpdateLoggedFoodMeal([...selectedLogIds], bulkAssignMeal)
    toast.success(
      `Moved ${selectedLogIds.size} ${selectedLogIds.size === 1 ? 'item' : 'items'} to ${bulkAssignMeal}`,
    )
    exitSelectMode()
  }

  const addRecipe = (
    meal?: string,
    overrides?: { foodId: string; quantity: number }[],
  ) => {
    if (!selectedFood) return
    addLoggedFood({
      foodId: selectedFood.id,
      quantity: 1,
      meal: meal || undefined,
      overriddenComponents: overrides,
    })
    toast.success(`Added ${selectedFood.name}`)
    resetFoodFlow()
  }

  const handleDuplicateYesterday = () => {
    const copied = duplicatePreviousDayLog(currentDate)
    if (copied == null) {
      toast.error('Yesterday has no logged foods to copy')
      return
    }
    if (!editDayMode) setEditDayMode(true)
    toast.success(
      `Copied ${copied} ${copied === 1 ? 'item' : 'items'} from yesterday — review and edit as needed`,
    )
  }

  return (
    <div className="daily-tab pb-below-nav">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 space-y-2.5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-1.5 justify-self-start">
            <EditIconButton
              variant={editDayMode ? 'default' : 'outline'}
              size="icon"
              className="h-12 w-12 shrink-0"
              iconClassName="h-6 w-6"
              label={editDayMode ? 'Exit edit mode' : 'Edit day'}
              onClick={() => setEditDayMode(!editDayMode)}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setCurrentDate(shiftDate(currentDate, -1))}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </div>

          <p className="px-3 text-center font-semibold text-[15px] whitespace-nowrap sm:text-base">
            {formatDisplayDate(currentDate)}
          </p>

          <div className="flex items-center gap-1.5 justify-self-end">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setCurrentDate(shiftDate(currentDate, 1))}
              aria-label="Next day"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0"
                  aria-label="Open calendar"
                  title="Open calendar"
                >
                  <CalendarIcon className="h-6 w-6" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={parseISO(currentDate)}
                  onSelect={(d) => d && setCurrentDate(format(d, 'yyyy-MM-dd'))}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {editDayMode && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={handleDuplicateYesterday}
          >
            <Copy className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Copy Yesterday</span>
          </Button>
        )}

        {editDayMode && templates.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="daily-goal-template" className="text-xs text-muted-foreground">
              Goal template for this day
            </Label>
            <select
              id="daily-goal-template"
              className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="off"
              value={activeTemplateId}
              onChange={(e) =>
                updateDailyLog(currentDate, { goalTemplateId: e.target.value })
              }
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.calories} cal
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      <div
        className={cn(
          'p-4 space-y-4 transition-colors duration-200',
          editDayMode && 'bg-daily-edit-surface',
        )}
      >
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">Net Calories</p>
          <p className="text-5xl font-bold tracking-tight text-primary">
            {roundMacro(netCalories, 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {roundMacro(consumed.calories, 0)} eaten − {log.burnedCalories} burned
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="flex items-baseline justify-between gap-2 border-b border-border px-3 py-2">
            <CardTitle className="text-sm font-semibold">Goals vs Remaining</CardTitle>
            <span className="text-xs text-muted-foreground truncate">
              {goal.name} · {goal.calories} cal
            </span>
          </div>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {METRICS.map(({ key, label, unit }) => {
                const goalVal = goal[key]
                const actual = consumed[key]
                const remaining = goalVal - actual
                const dec = key === 'calories' ? 0 : 1
                return (
                  <li
                    key={key}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-2 min-h-[44px]"
                  >
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-sm font-bold text-primary tabular-nums text-right">
                      {roundMacro(remaining, dec)}
                      {unit}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums text-right w-[4.5rem]">
                      {roundMacro(actual, dec)}/{goalVal}
                    </span>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center justify-between disabled:opacity-60"
            disabled={!editDayMode}
            onClick={() => {
              if (!editDayMode) return
              setBurnInput(String(log.burnedCalories))
              setBurnEditOpen(true)
            }}
          >
            <span className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              Burned calories
            </span>
            <span className="font-semibold">{log.burnedCalories} cal</span>
          </button>
          {editDayMode && (
            <EditIconButton
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              label="Edit burned calories"
              onClick={() => {
                setBurnInput(String(log.burnedCalories))
                setBurnEditOpen(true)
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center justify-between disabled:opacity-60"
            disabled={!editDayMode}
            onClick={() => {
              if (!editDayMode) return
              setWeightInput(
                log.weightKg != null
                  ? String(roundMacro(weightFromKg(log.weightKg, weightUnit), 1))
                  : '',
              )
              setWeightEditOpen(true)
            }}
          >
            <span className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Weight
            </span>
            <span className="font-semibold">
              {weightDisplay ?? (
                <span className="text-muted-foreground font-normal">Not logged</span>
              )}
            </span>
          </button>
          {editDayMode && (
            <EditIconButton
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              label="Edit weight"
              onClick={() => {
                setWeightInput(
                  log.weightKg != null
                    ? String(roundMacro(weightFromKg(log.weightKg, weightUnit), 1))
                    : '',
                )
                setWeightEditOpen(true)
              }}
            />
          )}
        </div>

        <div className="rounded-lg border border-border">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3"
            onClick={() => setNoteExpanded(!noteExpanded)}
          >
            <span className="font-medium">Daily note</span>
            {noteExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {noteExpanded && (
            <div className="px-4 pb-4">
              {editDayMode ? (
                <textarea
                  className="w-full min-h-[80px] rounded-lg border border-input bg-card p-3 text-sm"
                  value={log.note}
                  onChange={(e) => setDailyNote(e.target.value)}
                  placeholder="Notes for this day..."
                  {...mobileFriendlyInputProps}
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {log.note || 'No note'}
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-semibold">Logged foods</h3>
            {editDayMode && log.foods.length > 0 && (
              <div className="flex gap-2">
                {selectFoodsMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() =>
                      setSelectedLogIds(new Set(log.foods.map((f) => f.id)))
                    }
                  >
                    All
                  </Button>
                )}
                <Button
                  variant={selectFoodsMode ? 'default' : 'outline'}
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    if (selectFoodsMode) exitSelectMode()
                    else setSelectFoodsMode(true)
                  }}
                >
                  {selectFoodsMode ? 'Cancel' : 'Select'}
                </Button>
              </div>
            )}
          </div>

          {editDayMode && selectFoodsMode && log.foods.length > 0 && (
            <div className="sticky top-0 z-10 -mx-1 mb-3 bg-background/95 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <BulkMealAssignBar
                count={selectedLogIds.size}
                meals={meals}
                assignMeal={bulkAssignMeal}
                onAssignMealChange={setBulkAssignMeal}
                onAssign={handleBulkAssignMeal}
                onClear={() => setSelectedLogIds(new Set())}
                onDone={exitSelectMode}
              />
            </div>
          )}

          {log.foods.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No foods logged yet"
              description={
                editDayMode
                  ? 'Add your first food, copy yesterday\'s log, or pick a favorite from your library for quick logging.'
                  : 'Switch to Edit Day to start logging meals for this date.'
              }
              actionLabel={editDayMode ? 'Add your first food' : undefined}
              onAction={editDayMode ? () => setPickerOpen(true) : undefined}
            />
          ) : (
            <div className="space-y-4">
              {unassignedFoods.length > 0 && (
                <section>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Uncategorized
                  </h4>
                  <ul className="space-y-2">
                  {unassignedFoods.map((entry) => {
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
                        onToggleSelect={() => toggleLogSelection(entry.id)}
                        onOpenEdit={() => {
                          if (food?.isRecipe) setEditRecipeLogged(entry)
                          else setEditLogged(entry)
                        }}
                        onAssignMeal={(m) =>
                          updateLoggedFood(entry.id, { meal: m })
                        }
                      />
                    )
                  })}
                  </ul>
                </section>
              )}
              <DailyMealSections
                sections={foodsByMeal}
                allMeals={meals}
                editDayMode={editDayMode}
                currentDate={currentDate}
                foodLibrary={foodLibrary}
                meals={meals}
                collapsedMeals={collapsedMeals}
                selectFoodsMode={selectFoodsMode}
                selectedLogIds={selectedLogIds}
                onToggleSelect={toggleLogSelection}
                onOpenEdit={(entry, isRecipe) => {
                  if (isRecipe) setEditRecipeLogged(entry)
                  else setEditLogged(entry)
                }}
                onAssignMeal={(entryId, m) => updateLoggedFood(entryId, { meal: m })}
              />
            </div>
          )}
        </div>
      </div>

      {editDayMode && !selectFoodsMode && (
        <Button
          size="lg"
          className="fixed right-4 z-30 h-14 w-14 rounded-full shadow-lg p-0"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="h-7 w-7" />
        </Button>
      )}

      <FoodPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelectFood={handleSelectFood}
      />

      <AddFoodSheet
        open={addSheetOpen}
        food={selectedFood && !selectedFood.isRecipe ? selectedFood : null}
        meals={meals}
        date={currentDate}
        onOpenChange={setAddSheetOpen}
        onAdd={(result) => {
          if (!selectedFood) return
          addLoggedFood({
            foodId: selectedFood.id,
            quantity: result.quantity,
            scaleAmountEaten: result.scaleAmountEaten,
            note: result.note,
            meal: result.meal || undefined,
          })
          toast.success(`Added ${selectedFood.name}`)
          resetFoodFlow()
        }}
        onCancel={resetFoodFlow}
      />

      <RecipePreviewSheet
        open={previewOpen}
        food={selectedFood}
        meals={meals}
        onOpenChange={setPreviewOpen}
        onAdd={(meal) => addRecipe(meal)}
        onEdit={() => {
          setPreviewOpen(false)
          setCustomizeOpen(true)
        }}
        onCancel={() => {
          setPreviewOpen(false)
          setSelectedFood(null)
        }}
      />

      <RecipeCustomizeSheet
        open={customizeOpen}
        recipe={selectedFood}
        library={foodLibrary}
        meals={meals}
        defaultMeal={settings.defaultMeal}
        onOpenChange={setCustomizeOpen}
        onConfirm={(meal, overrides) => addRecipe(meal, overrides)}
        onCancel={() => {
          setCustomizeOpen(false)
          setPreviewOpen(true)
        }}
      />

      <EditLoggedSheet
        open={!!editLogged}
        entry={editLogged}
        food={editLogged ? foodLibrary.find((f) => f.id === editLogged.foodId) : undefined}
        meals={meals}
        date={currentDate}
        onClose={() => setEditLogged(null)}
        onSave={(patch) => {
          if (!editLogged) return
          updateLoggedFood(editLogged.id, patch)
          toast.success('Updated entry')
          setEditLogged(null)
        }}
        onDelete={() => {
          if (!editLogged) return
          removeLoggedFood(editLogged.id)
          toast.success('Removed entry')
          setEditLogged(null)
        }}
      />

      <EditLoggedRecipeSheet
        open={!!editRecipeLogged}
        entry={editRecipeLogged}
        recipe={
          editRecipeLogged
            ? foodLibrary.find((f) => f.id === editRecipeLogged.foodId) ?? null
            : null
        }
        library={foodLibrary}
        dateLabel={formatDisplayDate(currentDate)}
        onClose={() => setEditRecipeLogged(null)}
        onSave={(patch) => {
          if (!editRecipeLogged) return
          updateLoggedFood(editRecipeLogged.id, patch)
          setEditRecipeLogged(null)
        }}
        onDelete={() => {
          if (!editRecipeLogged) return
          removeLoggedFood(editRecipeLogged.id)
          toast.success('Removed entry')
          setEditRecipeLogged(null)
        }}
      />

      <Sheet open={burnEditOpen} onOpenChange={setBurnEditOpen}>
        <ModalViewport active={burnEditOpen} />
        <SheetContent side="bottom" className={scrollSheetContentClass}>
          <ScrollSheetHeader>
            <SheetTitle>Burned calories</SheetTitle>
          </ScrollSheetHeader>
          <ScrollSheetBody>
            <Input
              type="number"
              min={0}
              value={burnInput}
              onChange={(e) => setBurnInput(e.target.value)}
              className="text-2xl text-center h-14"
            />
          </ScrollSheetBody>
          <ScrollSheetFooter>
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                setBurnedCalories(parseInt(burnInput, 10) || 0)
                setBurnEditOpen(false)
                toast.success('Burned calories updated')
              }}
            >
              Save
            </Button>
            <Button size="lg" variant="ghost" className="w-full" onClick={() => setBurnEditOpen(false)}>
              Cancel
            </Button>
          </ScrollSheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={weightEditOpen} onOpenChange={setWeightEditOpen}>
        <ModalViewport active={weightEditOpen} />
        <SheetContent side="bottom" className={scrollSheetContentClass}>
          <ScrollSheetHeader>
            <SheetTitle>Weight ({weightUnitLabel(weightUnit)})</SheetTitle>
          </ScrollSheetHeader>
          <ScrollSheetBody className="space-y-2">
            <p className="text-xs text-muted-foreground">Optional — leave blank to clear</p>
            <Input
              type="number"
              min={0}
              inputMode="decimal"
              step={0.1}
              placeholder={`e.g. ${weightUnit === 'kg' ? '82' : '180'}`}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="text-2xl text-center h-14"
            />
          </ScrollSheetBody>
          <ScrollSheetFooter>
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                const kg = parseWeightInput(weightInput, weightUnit)
                setDailyWeight(kg)
                setWeightEditOpen(false)
                toast.success(kg != null ? 'Weight saved' : 'Weight cleared')
              }}
            >
              Save
            </Button>
            {log.weightKg != null && (
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => {
                  setDailyWeight(undefined)
                  setWeightInput('')
                  setWeightEditOpen(false)
                  toast.success('Weight cleared')
                }}
              >
                Clear weight
              </Button>
            )}
            <Button size="lg" variant="ghost" className="w-full" onClick={() => setWeightEditOpen(false)}>
              Cancel
            </Button>
          </ScrollSheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function EditLoggedSheet({
  open,
  entry,
  food,
  meals,
  date,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  entry: LoggedFood | null
  food?: FoodItem
  meals: string[]
  date: string
  onClose: () => void
  onSave: (patch: Partial<LoggedFood>) => void
  onDelete: () => void
}) {
  const [countQty, setCountQty] = useState(1)
  const [amountEaten, setAmountEaten] = useState(1)
  const [note, setNote] = useState('')
  const [meal, setMeal] = useState('')

  useEffect(() => {
    if (!entry || !food) return
    setNote(entry.note ?? '')
    setMeal(
      entry.meal?.trim() ? normalizeMealName(entry.meal, meals) : '',
    )
    if (food.scaleType === 'scale') {
      setAmountEaten(
        entry.scaleAmountEaten ??
          amountEatenFromServings(getFoodBaseAmount(food), entry.quantity),
      )
    } else {
      setCountQty(Math.max(1, Math.round(entry.quantity)))
    }
  }, [entry, food, meals])

  const previewMacros = useMemo(() => {
    if (!food || food.isRecipe) return null
    if (food.scaleType === 'count') {
      return scaleMacros(food, Math.max(1, Math.round(countQty)))
    }
    const mult = servingsFromAmountEaten(getFoodBaseAmount(food), amountEaten)
    return scaleMacros(food, mult)
  }, [food, countQty, amountEaten])

  if (!entry || !food || food.isRecipe) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <ModalViewport active={open} />
        <SheetContent side="bottom" className={scrollSheetContentClass}>
          <ScrollSheetHeader>
            <SheetTitle>Edit entry</SheetTitle>
          </ScrollSheetHeader>
          <ScrollSheetBody>
            {food?.isRecipe && (
              <p className="text-sm text-muted-foreground">
                Recipe entries: remove and re-add to change components.
              </p>
            )}
          </ScrollSheetBody>
          <ScrollSheetFooter>
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

  const dateLabel = format(parseISO(date), 'MMM d, yyyy')

  const handleSave = () => {
    if (food.scaleType === 'count') {
      onSave({
        quantity: Math.max(1, Math.round(countQty)),
        scaleAmountEaten: undefined,
        note: note || undefined,
        meal: meal || undefined,
      })
    } else {
      onSave({
        ...buildScaleLogPayload(food, amountEaten),
        note: note || undefined,
        meal: meal || undefined,
      })
    }
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
          <SheetTitle>Edit {food.name}</SheetTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Changes apply to this day&apos;s log only.
          </p>
        </ScrollSheetHeader>
        <ScrollSheetBody className="space-y-4">
          <MealPicker label="Meal" meals={meals} value={meal} onChange={setMeal} compact />
          {previewMacros && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-center">
              <p className="text-xs text-muted-foreground mb-1">Macros for this entry</p>
              <p className="text-lg font-bold text-primary tabular-nums">
                {roundMacro(previewMacros.calories, 0)} cal
              </p>
              <LoggedMacroPreview macros={previewMacros} size="md" className="mt-1" />
            </div>
          )}
          <QuantityInput
            food={food}
            note={note}
            onNoteChange={setNote}
            countQuantity={countQty}
            onCountQuantityChange={setCountQty}
            amountEaten={amountEaten}
            onAmountEatenChange={setAmountEaten}
            showInlineMacroPreview={false}
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