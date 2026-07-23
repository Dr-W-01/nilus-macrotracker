import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppBackHandler } from '@/hooks/useAppBackHandler'
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
  NotebookPen,
  Target,
  UtensilsCrossed,
} from 'lucide-react'
import { toast } from 'sonner'
import { toastFoodAdded, toastFoodRemoved, toastFoodUpdated, toastMealAssigned } from '@/lib/foodToast'
import { AddFoodSheet } from '@/components/daily/AddFoodSheet'
import { EditLoggedRecipeSheet } from '@/components/daily/EditLoggedRecipeSheet'
import { FoodPickerSheet } from '@/components/daily/FoodPickerSheet'
import { BulkMealAssignBar } from '@/components/daily/BulkMealAssignBar'
import { DailyMealSections } from '@/components/daily/DailyMealSections'
import { LoggedFoodEntryRow } from '@/components/daily/LoggedFoodEntryRow'
import { MealPicker } from '@/components/daily/MealPicker'

import { RecipeCustomizeSheet } from '@/components/daily/RecipeCustomizeSheet'
import { RecipePreviewSheet } from '@/components/daily/RecipePreviewSheet'
import { FoodNoteField, QuantityInput } from '@/components/daily/QuantityInput'
import { Button } from '@/components/ui/button'
import { FormSection } from '@/components/ui/form-section'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { EditIconButton } from '@/components/ui/edit-icon-button'
import { AppSelect } from '@/components/ui/app-select'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  ModalViewport,
  ScrollDialogBody,
  ScrollDialogFooter,
  ScrollDialogHeader,
  scrollDialogContentClass,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetHeader,
  scrollSheetContentClass,
} from '@/components/ui/scroll-modal'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { formatDailyViewHeaderDate, formatDisplayDate, shiftDate } from '@/lib/dates'
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
import {
  isTrackBurnedCaloriesEnabled,
  isTrackCurrentWeightEnabled,
} from '@/lib/trackingSettings'
import { SURFACE_GRADIENT_COMPACT, SURFACE_GRADIENT_ROUNDED } from '@/lib/surfaceStyles'
import { cn } from '@/lib/utils'
import { resolveGoalForLog } from '@/lib/goals'
import { resolveDefaultMealForLog, resolveMealsForLog } from '@/lib/mealProfiles'
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
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const settings = useMacroStore((s) => s.settings)
  const getDailyLog = useMacroStore((s) => s.getDailyLog)
  const storedLog = useMacroStore((s) => s.dailyLogs[s.currentDate])
  const addLoggedFood = useMacroStore((s) => s.addLoggedFood)
  const updateLoggedFood = useMacroStore((s) => s.updateLoggedFood)
  const dailyLogs = useMacroStore((s) => s.dailyLogs)
  const bulkRemoveLoggedFood = useMacroStore((s) => s.bulkRemoveLoggedFood)
  const removeLoggedFood = useMacroStore((s) => s.removeLoggedFood)
  const setBurnedCalories = useMacroStore((s) => s.setBurnedCalories)
  const setDailyWeight = useMacroStore((s) => s.setDailyWeight)
  const setDailyNote = useMacroStore((s) => s.setDailyNote)
  const dailyNote = useMacroStore((s) => s.dailyLogs[s.currentDate]?.note ?? '')
  const collapsedMealNames = useMacroStore(
    (s) => s.mealCollapseByDate[s.currentDate] ?? NO_COLLAPSED_MEALS,
  )
  const updateDailyLog = useMacroStore((s) => s.updateDailyLog)
  const duplicatePreviousDayLog = useMacroStore((s) => s.duplicatePreviousDayLog)

  const log = useMemo(
    () => storedLog ?? getDailyLog(currentDate),
    [storedLog, currentDate, getDailyLog],
  )
  const templates = settings?.goalTemplates ?? []
  const goal = settings ? resolveGoalForLog(log, settings) : templates[0]

  const activeTemplateId = log.goalTemplateId || settings?.defaultTemplateId || 'default'

  const mealProfiles = settings?.mealProfiles ?? []
  const activeMealProfileId =
    log.mealProfileId || settings?.defaultMealProfileId || 'standard'
  const viewHeaderDate = formatDailyViewHeaderDate(currentDate)

  const consumed = useMemo(
    () => computeDayMacros(foodLibrary, log.foods),
    [foodLibrary, log.foods],
  )

  const trackBurnedCalories = isTrackBurnedCaloriesEnabled(settings)
  const trackCurrentWeight = isTrackCurrentWeightEnabled(settings)
  const netCalories = consumed.calories - log.burnedCalories

  const [pickerOpen, setPickerOpen] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [editLogged, setEditLogged] = useState<LoggedFood | null>(null)
  const [editRecipeLogged, setEditRecipeLogged] = useState<LoggedFood | null>(null)

  const meals = useMemo(
    () => (settings ? resolveMealsForLog(log, settings) : normalizeMeals()),
    [log, settings],
  )
  const defaultMeal = useMemo(
    () => (settings ? resolveDefaultMealForLog(log, settings) : meals[0]),
    [log, settings, meals],
  )
  const [selectFoodsMode, setSelectFoodsMode] = useState(false)
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set())
  const collapsedMeals = useMemo(
    () => new Set(collapsedMealNames),
    [collapsedMealNames],
  )

  useEffect(() => {
    setSelectFoodsMode(false)
    setSelectedLogIds(new Set())
  }, [currentDate])

  const exitSelectFoodsMode = useCallback(() => {
    setSelectFoodsMode(false)
    setSelectedLogIds(new Set())
  }, [])

  useAppBackHandler(exitSelectFoodsMode, selectFoodsMode)

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
  const [noteExpanded, setNoteExpanded] = useState(false)
  const [noteEditOpen, setNoteEditOpen] = useState(false)
  const [noteInput, setNoteInput] = useState(dailyNote)
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
  const [copyYesterdayConfirmOpen, setCopyYesterdayConfirmOpen] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    setNoteExpanded(false)
  }, [currentDate])

  const goalTemplateOptions = useMemo(
    () =>
      templates.map((t) => ({
        value: t.id,
        label: t.name,
        description: `${t.calories} cal · P ${t.protein}g · C ${t.carbs}g · F ${t.fat}g`,
      })),
    [templates],
  )

  const mealProfileOptions = useMemo(
    () =>
      mealProfiles.map((p) => ({
        value: p.id,
        label: p.name,
        description: p.meals.join(', '),
      })),
    [mealProfiles],
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

  const pendingLibraryFoodId = useMacroStore((s) => s.pendingLibraryFoodId)
  const setPendingLibraryFoodId = useMacroStore((s) => s.setPendingLibraryFoodId)

  useEffect(() => {
    if (!pendingLibraryFoodId) return
    const food = foodLibrary.find((f) => f.id === pendingLibraryFoodId)
    setPendingLibraryFoodId(null)
    if (!food) return
    setPickerOpen(false)
    setSelectedFood(food)
    if (food.isRecipe) setPreviewOpen(true)
    else setAddSheetOpen(true)
  }, [pendingLibraryFoodId, foodLibrary, setPendingLibraryFoodId])

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

  const datesWithLoggedFood = useMemo(
    () =>
      Object.entries(dailyLogs)
        .filter(([, dayLog]) => dayLog.foods.length > 0)
        .map(([date]) => parseISO(date)),
    [dailyLogs],
  )

  const handleBulkDelete = () => {
    const count = selectedLogIds.size
    if (count === 0) return
    bulkRemoveLoggedFood([...selectedLogIds])
    setBulkDeleteConfirmOpen(false)
    toast.success(`Removed ${count} ${count === 1 ? 'item' : 'items'} from today's log`)
    exitSelectMode()
  }

  const addRecipe = (
    meal?: string,
    overrides?: { foodId: string; quantity: number }[],
    quantity = 1,
  ) => {
    if (!selectedFood) return
    addLoggedFood({
      foodId: selectedFood.id,
      quantity: Math.max(1, Math.round(quantity)),
      meal: meal || undefined,
      overriddenComponents: overrides,
    })
    toastFoodAdded(selectedFood.name)
    resetFoodFlow()
  }

  const openNoteEdit = () => {
    setNoteInput(dailyNote)
    setNoteEditOpen(true)
  }

  const openBurnEdit = () => {
    setBurnInput(String(log.burnedCalories))
    setBurnEditOpen(true)
  }

  const openWeightEdit = () => {
    setWeightInput(
      log.weightKg != null
        ? String(roundMacro(weightFromKg(log.weightKg, weightUnit), 1))
        : '',
    )
    setWeightEditOpen(true)
  }

  const applyDuplicateYesterday = () => {
    const copied = duplicatePreviousDayLog(currentDate)
    setCopyYesterdayConfirmOpen(false)
    if (copied == null) {
      toast.error('Yesterday has no logged foods to copy')
      return
    }
    toast.success(
      `Copied ${copied} ${copied === 1 ? 'item' : 'items'} from yesterday — review and edit as needed`,
    )
  }

  return (
    <div className="daily-tab">
      <header className="tab-sticky-header px-4 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-1.5 justify-self-start">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setCurrentDate(shiftDate(currentDate, -1))}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <span className="h-12 w-12 shrink-0" aria-hidden />
          </div>

          <div className="flex flex-col items-center px-3 justify-center leading-none">
            <p className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground">
              {viewHeaderDate.dayLabel}
            </p>
            <p className="mt-0.5 text-[17px] font-semibold sm:text-lg">
              {viewHeaderDate.dateLabel}
            </p>
          </div>

          <div className="flex items-center gap-1.5 justify-self-end">
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
                  modifiers={{ has_food: datesWithLoggedFood }}
                  modifiersClassNames={{ has_food: 'has-food-day' }}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setCurrentDate(shiftDate(currentDate, 1))}
              aria-label="Next day"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      <div className="space-y-4 p-4">
        <div className={cn('text-center py-2', SURFACE_GRADIENT_ROUNDED, 'px-4 py-5')}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {trackBurnedCalories ? 'Net Calories' : 'Calories'}
          </p>
          <p className="text-6xl font-bold tracking-tight text-primary tabular-nums sm:text-7xl">
            {roundMacro(trackBurnedCalories ? netCalories : consumed.calories, 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {trackBurnedCalories
              ? `${roundMacro(consumed.calories, 0)} eaten − ${log.burnedCalories} burned`
              : `${roundMacro(consumed.calories, 0)} eaten`}
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

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-semibold">Logged foods</h3>
            {log.foods.length > 0 && (
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

          {selectFoodsMode && log.foods.length > 0 && (
            <div className="sticky top-0 z-10 -mx-1 mb-3 bg-background py-1">
              <BulkMealAssignBar
                count={selectedLogIds.size}
                onDelete={() => setBulkDeleteConfirmOpen(true)}
                onClear={() => setSelectedLogIds(new Set())}
                onDone={exitSelectMode}
              />
            </div>
          )}

          {log.foods.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No foods logged yet"
              description="Add your first food from your library, copy yesterday's log, or use a favorite for quick logging."
              actionLabel="Add your first food"
              onAction={() => setPickerOpen(true)}
              secondaryActionLabel="Browse Library"
              onSecondaryAction={() => useMacroStore.getState().setCurrentTab('library')}
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
                        selectFoodsMode={selectFoodsMode}
                        selected={selectedLogIds.has(entry.id)}
                        isUncategorized
                        onToggleSelect={() => toggleLogSelection(entry.id)}
                        onOpenEdit={() => {
                          if (food?.isRecipe) setEditRecipeLogged(entry)
                          else setEditLogged(entry)
                        }}
                        onAssignMeal={(m) => {
                          updateLoggedFood(entry.id, { meal: m })
                          if (m) toastMealAssigned(m, food?.name)
                        }}
                      />
                    )
                  })}
                  </ul>
                </section>
              )}
              <DailyMealSections
                sections={foodsByMeal}
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
                onAssignMeal={(entryId, m) => {
                  updateLoggedFood(entryId, { meal: m })
                  if (m) {
                    const foodName = foodLibrary.find(
                      (f) => f.id === log.foods.find((e) => e.id === entryId)?.foodId,
                    )?.name
                    toastMealAssigned(m, foodName)
                  }
                }}
              />
            </div>
          )}
        </div>

        {trackBurnedCalories && (
        <div className={cn(SURFACE_GRADIENT_COMPACT, 'daily-meta-row')}>
          <div className="flex min-w-0 flex-1 items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm leading-tight">
              <Flame className="h-4 w-4 shrink-0 text-primary" />
              Burned calories
            </span>
            <span className="text-sm font-semibold leading-tight">{log.burnedCalories} cal</span>
          </div>
          <EditIconButton
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            label="Edit burned calories"
            onClick={openBurnEdit}
          />
        </div>
        )}

        {trackCurrentWeight && (
        <div className={cn(SURFACE_GRADIENT_COMPACT, 'daily-meta-row')}>
          <div className="flex min-w-0 flex-1 items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm leading-tight">
              <Scale className="h-4 w-4 shrink-0 text-primary" />
              Weight
            </span>
            <span className="text-sm font-semibold leading-tight">
              {weightDisplay ?? (
                <span className="text-muted-foreground font-normal">Not logged</span>
              )}
            </span>
          </div>
          <EditIconButton
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            label="Edit weight"
            onClick={openWeightEdit}
          />
        </div>
        )}

        <div className={SURFACE_GRADIENT_COMPACT}>
          <div className="daily-meta-row">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center justify-between"
              onClick={() => setNoteExpanded(!noteExpanded)}
            >
              <span className="flex items-center gap-1.5 text-sm">
                <NotebookPen className="h-4 w-4 text-primary" />
                Daily note
              </span>
              {noteExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
            </button>
            <EditIconButton
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              label="Edit daily note"
              onClick={openNoteEdit}
            />
          </div>
          {noteExpanded && (
            <div className="w-full border-t border-border/60 px-3 pb-2 pt-1.5 text-left">
              {dailyNote ? (
                <p className="text-sm whitespace-pre-wrap text-foreground">{dailyNote}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No note for this day.</p>
              )}
            </div>
          )}
        </div>

        {templates.length > 0 && (
          <div className={cn(SURFACE_GRADIENT_COMPACT, 'daily-meta-row')}>
            <span className="flex shrink-0 items-center gap-1.5 text-sm leading-tight">
              <Target className="h-4 w-4 shrink-0 text-primary" />
              Goal template
            </span>
            <AppSelect
              compact
              className="min-w-0 max-w-[60%] flex-1"
              aria-label="Goal template"
              value={activeTemplateId}
              options={goalTemplateOptions}
              onChange={(id) => {
                if (id === activeTemplateId) return
                updateDailyLog(currentDate, { goalTemplateId: id })
                toast.success('Goal template updated')
              }}
            />
          </div>
        )}

        {mealProfiles.length > 0 && (
          <div className={cn(SURFACE_GRADIENT_COMPACT, 'daily-meta-row')}>
            <span className="flex shrink-0 items-center gap-1.5 text-sm leading-tight">
              <UtensilsCrossed className="h-4 w-4 shrink-0 text-primary" />
              Meal profile
            </span>
            <AppSelect
              compact
              className="min-w-0 max-w-[60%] flex-1"
              aria-label="Meal profile"
              value={activeMealProfileId}
              options={mealProfileOptions}
              onChange={(id) => {
                if (id === activeMealProfileId) return
                updateDailyLog(currentDate, { mealProfileId: id })
                toast.success('Meal profile updated')
              }}
            />
          </div>
        )}

        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-muted-foreground"
            onClick={() => setCopyYesterdayConfirmOpen(true)}
          >
            <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Copy yesterday
          </Button>
        </div>
      </div>

      {!selectFoodsMode && (
        <Button
          size="lg"
          className="fixed right-4 z-30 h-14 w-14 rounded-full shadow-lg p-0"
          style={{ bottom: 'calc(var(--bottom-nav-total) + 0.5rem)' }}
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
          toastFoodAdded(selectedFood.name)
          resetFoodFlow()
        }}
        onCancel={resetFoodFlow}
      />

      <RecipePreviewSheet
        open={previewOpen}
        food={selectedFood}
        meals={meals}
        onOpenChange={setPreviewOpen}
        onAdd={(meal, quantity) => addRecipe(meal, undefined, quantity)}
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
        defaultMeal={defaultMeal}
        onOpenChange={setCustomizeOpen}
        onConfirm={(meal, overrides, quantity) => addRecipe(meal, overrides, quantity)}
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
          const foodName = foodLibrary.find((f) => f.id === editLogged.foodId)?.name
          updateLoggedFood(editLogged.id, patch)
          toastFoodUpdated(foodName)
          setEditLogged(null)
        }}
        onDelete={() => {
          if (!editLogged) return
          const foodName = foodLibrary.find((f) => f.id === editLogged.foodId)?.name
          removeLoggedFood(editLogged.id)
          toastFoodRemoved(foodName)
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
          const foodName = foodLibrary.find((f) => f.id === editRecipeLogged.foodId)?.name
          updateLoggedFood(editRecipeLogged.id, patch)
          toastFoodUpdated(foodName)
          setEditRecipeLogged(null)
        }}
        onDelete={() => {
          if (!editRecipeLogged) return
          const foodName = foodLibrary.find((f) => f.id === editRecipeLogged.foodId)?.name
          removeLoggedFood(editRecipeLogged.id)
          toastFoodRemoved(foodName)
          setEditRecipeLogged(null)
        }}
      />

      {trackBurnedCalories && (
      <Sheet open={burnEditOpen} onOpenChange={setBurnEditOpen}>
        <ModalViewport active={burnEditOpen} onRequestClose={() => setBurnEditOpen(false)} />
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
      )}

      <Dialog open={copyYesterdayConfirmOpen} onOpenChange={setCopyYesterdayConfirmOpen}>
        <ModalViewport
          active={copyYesterdayConfirmOpen}
          onRequestClose={() => setCopyYesterdayConfirmOpen(false)}
        />
        <DialogContent className={scrollDialogContentClass}>
          <ScrollDialogHeader>
            <DialogTitle>Copy yesterday&apos;s log?</DialogTitle>
          </ScrollDialogHeader>
          <ScrollDialogBody className="py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to copy yesterday&apos;s log? This will replace today&apos;s
              current entries.
            </p>
          </ScrollDialogBody>
          <ScrollDialogFooter>
            <Button size="lg" className="w-full" onClick={applyDuplicateYesterday}>
              Copy yesterday
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="w-full"
              onClick={() => setCopyYesterdayConfirmOpen(false)}
            >
              Cancel
            </Button>
          </ScrollDialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <ModalViewport
          active={bulkDeleteConfirmOpen}
          onRequestClose={() => setBulkDeleteConfirmOpen(false)}
        />
        <DialogContent className={scrollDialogContentClass}>
          <ScrollDialogHeader>
            <DialogTitle>
              Delete {selectedLogIds.size}{' '}
              {selectedLogIds.size === 1 ? 'item' : 'items'}?
            </DialogTitle>
          </ScrollDialogHeader>
          <ScrollDialogBody className="py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete these {selectedLogIds.size}{' '}
              {selectedLogIds.size === 1 ? 'item' : 'items'}? This cannot be undone.
            </p>
          </ScrollDialogBody>
          <ScrollDialogFooter>
            <Button size="lg" variant="destructive" className="w-full" onClick={handleBulkDelete}>
              Delete permanently
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="w-full"
              onClick={() => setBulkDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
          </ScrollDialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={noteEditOpen} onOpenChange={setNoteEditOpen}>
        <ModalViewport active={noteEditOpen} onRequestClose={() => setNoteEditOpen(false)} />
        <SheetContent side="bottom" className={scrollSheetContentClass}>
          <ScrollSheetHeader>
            <SheetTitle>Daily note</SheetTitle>
          </ScrollSheetHeader>
          <ScrollSheetBody>
            <textarea
              className="w-full min-h-[140px] rounded-lg border border-input bg-card p-3 text-sm"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Notes for this day..."
              {...mobileFriendlyInputProps}
            />
          </ScrollSheetBody>
          <ScrollSheetFooter>
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                setDailyNote(noteInput)
                setNoteEditOpen(false)
                if (noteInput.trim()) setNoteExpanded(true)
                toast.success('Daily note saved')
              }}
            >
              Save
            </Button>
            {dailyNote.trim() && (
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => {
                  setNoteInput('')
                  setDailyNote('')
                  setNoteEditOpen(false)
                  setNoteExpanded(false)
                  toast.success('Daily note cleared')
                }}
              >
                Clear note
              </Button>
            )}
            <Button size="lg" variant="ghost" className="w-full" onClick={() => setNoteEditOpen(false)}>
              Cancel
            </Button>
          </ScrollSheetFooter>
        </SheetContent>
      </Sheet>

      {trackCurrentWeight && (
      <Sheet open={weightEditOpen} onOpenChange={setWeightEditOpen}>
        <ModalViewport active={weightEditOpen} onRequestClose={() => setWeightEditOpen(false)} />
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
      )}
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
        <ModalViewport active={open} onRequestClose={onClose} />
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
      <ModalViewport active={open} onRequestClose={onClose} />
      <SheetContent
        side="bottom"
        className={scrollSheetContentClass}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollSheetHeader>
          <SheetTitle>{food.name}</SheetTitle>
          <p className="text-xs font-normal text-muted-foreground">
            Edit for {dateLabel}
          </p>
        </ScrollSheetHeader>
        <ScrollSheetBody className="space-y-3">
          <QuantityInput
            food={food}
            note={note}
            onNoteChange={setNote}
            countQuantity={countQty}
            onCountQuantityChange={setCountQty}
            amountEaten={amountEaten}
            onAmountEatenChange={setAmountEaten}
            showNote={false}
            showInlineMacroPreview={false}
          />
          {previewMacros && (
            <div className="text-center">
              <p className="text-lg font-bold text-primary tabular-nums">
                {roundMacro(previewMacros.calories, 0)} cal
              </p>
              <LoggedMacroPreview macros={previewMacros} size="md" className="mt-0.5" />
            </div>
          )}
          <FormSection title="Details" className="p-3 space-y-2.5">
            <MealPicker
              label="Meal"
              meals={meals}
              value={meal}
              onChange={setMeal}
              showEmptyHint={false}
            />
            <FoodNoteField note={note} onNoteChange={setNote} />
          </FormSection>
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