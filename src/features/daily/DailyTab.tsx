import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Flame,
  Plus,
  Scale,
} from 'lucide-react'
import { toast } from 'sonner'
import { AddFoodSheet } from '@/components/daily/AddFoodSheet'
import { EditLoggedRecipeSheet } from '@/components/daily/EditLoggedRecipeSheet'
import { FoodPickerSheet } from '@/components/daily/FoodPickerSheet'
import { BulkMealAssignBar } from '@/components/daily/BulkMealAssignBar'
import { MealPicker } from '@/components/daily/MealPicker'
import { Checkbox } from '@/components/ui/checkbox'
import { RecipeCustomizeSheet } from '@/components/daily/RecipeCustomizeSheet'
import { RecipePreviewSheet } from '@/components/daily/RecipePreviewSheet'
import { QuantityInput } from '@/components/daily/QuantityInput'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
  formatLoggedFoodQuantity,
  getFoodBaseAmount,
  servingsFromAmountEaten,
} from '@/lib/scale'
import { LoggedMacroPreview } from '@/components/daily/LoggedMacroPreview'
import {
  computeDayMacros,
  formatMealGroupTotals,
  getLoggedFoodMacros,
  roundMacro,
  scaleMacros,
} from '@/lib/macros'
import { mealSortIndex, normalizeMealName, normalizeMeals } from '@/lib/meals'
import type { FoodItem, LoggedFood } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'

const METRICS = [
  { key: 'calories', label: 'Calories', unit: '' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugars', label: 'Sugars', unit: 'g' },
] as const

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
  const updateDailyLog = useMacroStore((s) => s.updateDailyLog)
  const updateSettings = useMacroStore((s) => s.updateSettings)

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
  const defaultMeal = normalizeMealName(settings?.defaultMeal, meals)

  const [selectFoodsMode, setSelectFoodsMode] = useState(false)
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set())
  const [bulkAssignMeal, setBulkAssignMeal] = useState(defaultMeal)

  useEffect(() => {
    setBulkAssignMeal(defaultMeal)
  }, [defaultMeal])

  useEffect(() => {
    setSelectFoodsMode(false)
    setSelectedLogIds(new Set())
  }, [currentDate, editDayMode])

  const foodsByMeal = useMemo(() => {
    const groups = new Map<string, LoggedFood[]>()
    for (const entry of log.foods) {
      const meal = normalizeMealName(entry.meal, meals)
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
    return mealOrder
      .filter((meal) => (groups.get(meal)?.length ?? 0) > 0)
      .map((meal) => {
        const entries = groups.get(meal)!
        return {
          meal,
          entries,
          totals: computeDayMacros(foodLibrary, entries),
        }
      })
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

  const addRecipe = (overrides?: { foodId: string; quantity: number }[]) => {
    if (!selectedFood) return
    addLoggedFood({
      foodId: selectedFood.id,
      quantity: 1,
      meal: defaultMeal,
      overriddenComponents: overrides,
    })
    toast.success(`Added ${selectedFood.name}`)
    resetFoodFlow()
  }

  return (
    <div className="daily-tab flex flex-col pb-24">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant={editDayMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEditDayMode(!editDayMode)}
          >
            {editDayMode ? 'View Mode' : 'Edit Day'}
          </Button>
          <span className="text-xs text-muted-foreground">
            {editDayMode ? 'Editing enabled' : 'Read-only'}
          </span>
        </div>

        {editDayMode && templates.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="daily-goal-template" className="text-xs text-muted-foreground">
              Goal template for this day
            </Label>
            <select
              id="daily-goal-template"
              className="flex h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(shiftDate(currentDate, -1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <p className="font-semibold">{formatDisplayDate(currentDate)}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(shiftDate(currentDate, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <CalendarIcon className="h-5 w-5" />
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
      </header>

      <div className="p-4 space-y-4">
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

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3"
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

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3"
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
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {log.note || 'No note'}
                </p>
              )}
            </div>
          )}
        </div>

        {editDayMode && (
          <MealPicker
            label="New entries log to"
            meals={meals}
            value={defaultMeal}
            onChange={(meal) => updateSettings({ defaultMeal: meal })}
            compact
          />
        )}

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
          {log.foods.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-muted-foreground mb-4">No foods logged yet</p>
              {editDayMode && (
                <Button onClick={() => setPickerOpen(true)}>Add your first food</Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {foodsByMeal.map(({ meal, entries, totals }) => (
                <section key={meal}>
                  <h4 className="text-xs font-semibold text-primary mb-1.5 px-0.5 leading-snug">
                    <span className="uppercase tracking-wide">{meal}</span>{' '}
                    <span className="font-normal text-muted-foreground normal-case tracking-normal tabular-nums">
                      ({formatMealGroupTotals(totals)})
                    </span>
                  </h4>
                  <ul className="space-y-2">
                    {entries.map((entry) => {
                      const food = foodLibrary.find((f) => f.id === entry.foodId)
                      const macros = getLoggedFoodMacros(foodLibrary, entry)
                      const entryMeal = normalizeMealName(entry.meal, meals)
                      return (
                        <li key={entry.id}>
                          <button
                            type="button"
                            className={`flex w-full flex-col gap-1 rounded-lg border bg-card px-3 py-2.5 text-left ${
                              selectFoodsMode && selectedLogIds.has(entry.id)
                                ? 'border-primary bg-primary/10'
                                : 'border-border'
                            }`}
                            onClick={() => {
                              if (!editDayMode) return
                              if (selectFoodsMode) {
                                toggleLogSelection(entry.id)
                                return
                              }
                              if (food?.isRecipe) setEditRecipeLogged(entry)
                              else setEditLogged(entry)
                            }}
                          >
                            <div className="flex w-full items-start justify-between gap-2">
                              {selectFoodsMode && (
                                <Checkbox
                                  checked={selectedLogIds.has(entry.id)}
                                  onChange={() => toggleLogSelection(entry.id)}
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
                              <span className="text-sm font-medium shrink-0">
                                {roundMacro(macros.calories, 0)} cal
                              </span>
                            </div>
                            {editDayMode && !selectFoodsMode && (
                              <div
                                className="flex flex-wrap gap-1 pt-0.5"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                {meals.map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    className={`rounded-full px-2 py-0.5 text-[10px] border min-h-7 ${
                                      m.toLowerCase() === entryMeal.toLowerCase()
                                        ? 'border-primary bg-primary/20 text-primary'
                                        : 'border-border text-muted-foreground'
                                    }`}
                                    onClick={() => {
                                      if (m.toLowerCase() === entryMeal.toLowerCase()) return
                                      updateLoggedFood(entry.id, { meal: m })
                                    }}
                                  >
                                    {m}
                                  </button>
                                ))}
                              </div>
                            )}
                            <LoggedMacroPreview macros={macros} size="sm" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {editDayMode && selectFoodsMode && (
        <BulkMealAssignBar
          count={selectedLogIds.size}
          meals={meals}
          assignMeal={bulkAssignMeal}
          onAssignMealChange={setBulkAssignMeal}
          onAssign={handleBulkAssignMeal}
          onClear={() => setSelectedLogIds(new Set())}
          onDone={exitSelectMode}
        />
      )}

      {editDayMode && !selectFoodsMode && (
        <Button
          size="lg"
          className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg p-0"
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
        date={currentDate}
        onOpenChange={setAddSheetOpen}
        onAdd={(result) => {
          if (!selectedFood) return
          addLoggedFood({
            foodId: selectedFood.id,
            quantity: result.quantity,
            scaleAmountEaten: result.scaleAmountEaten,
            note: result.note,
            meal: defaultMeal,
          })
          toast.success(`Added ${selectedFood.name}`)
          resetFoodFlow()
        }}
        onCancel={resetFoodFlow}
      />

      <RecipePreviewSheet
        open={previewOpen}
        food={selectedFood}
        onOpenChange={setPreviewOpen}
        onAdd={() => addRecipe()}
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
        onOpenChange={setCustomizeOpen}
        onConfirm={(overrides) => addRecipe(overrides)}
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
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Burned calories</SheetTitle>
          </SheetHeader>
          <Input
            type="number"
            min={0}
            value={burnInput}
            onChange={(e) => setBurnInput(e.target.value)}
            className="text-2xl text-center h-14 my-4"
          />
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
        </SheetContent>
      </Sheet>

      <Sheet open={weightEditOpen} onOpenChange={setWeightEditOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Weight ({weightUnitLabel(weightUnit)})</SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground">Optional — leave blank to clear</p>
          <Input
            type="number"
            min={0}
            inputMode="decimal"
            step={0.1}
            placeholder={`e.g. ${weightUnit === 'kg' ? '82' : '180'}`}
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            className="text-2xl text-center h-14 my-4"
          />
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
              variant="ghost"
              className="w-full mt-2"
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
  const [meal, setMeal] = useState(meals[0] ?? 'Breakfast')

  useEffect(() => {
    if (!entry || !food) return
    setNote(entry.note ?? '')
    setMeal(normalizeMealName(entry.meal, meals))
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
        <SheetContent side="bottom">
          <SheetHeader><SheetTitle>Edit entry</SheetTitle></SheetHeader>
          {food?.isRecipe && (
            <p className="text-sm text-muted-foreground py-4">
              Recipe entries: remove and re-add to change components.
            </p>
          )}
          <Button variant="destructive" className="w-full" onClick={onDelete}>Remove from day</Button>
          <Button variant="ghost" className="w-full mt-2" onClick={onClose}>Cancel</Button>
        </SheetContent>
      </Sheet>
    )
  }

  const dateLabel = format(parseISO(date), 'MMM d, yyyy')

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom">
        <SheetHeader><SheetTitle>Edit {food.name}</SheetTitle></SheetHeader>
        <p className="text-xs text-muted-foreground -mt-2 mb-2">
          Changes apply to this day&apos;s log only.
        </p>
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
        <Button
          size="lg"
          className="w-full mt-4"
          onClick={() => {
            if (food.scaleType === 'count') {
              onSave({
                quantity: Math.max(1, Math.round(countQty)),
                scaleAmountEaten: undefined,
                note: note || undefined,
                meal,
              })
            } else {
              onSave({
                ...buildScaleLogPayload(food, amountEaten),
                note: note || undefined,
                meal,
              })
            }
          }}
        >
          Save for {dateLabel}
        </Button>
        <Button variant="destructive" className="w-full mt-2" onClick={onDelete}>
          Remove from day
        </Button>
        <Button variant="ghost" className="w-full mt-2" onClick={onClose}>Cancel</Button>
      </SheetContent>
    </Sheet>
  )
}