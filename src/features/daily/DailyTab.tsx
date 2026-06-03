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
} from 'lucide-react'
import { toast } from 'sonner'
import { AddFoodSheet } from '@/components/daily/AddFoodSheet'
import { FoodPickerSheet } from '@/components/daily/FoodPickerSheet'
import { RecipeCustomizeSheet } from '@/components/daily/RecipeCustomizeSheet'
import { RecipePreviewSheet } from '@/components/daily/RecipePreviewSheet'
import { QuantityInput } from '@/components/daily/QuantityInput'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDisplayDate, shiftDate } from '@/lib/dates'
import {
  amountEatenFromServings,
  buildScaleLogPayload,
  formatLoggedFoodQuantity,
  getFoodBaseAmount,
} from '@/lib/scale'
import {
  computeDayMacros,
  getLoggedFoodMacros,
  roundMacro,
} from '@/lib/macros'
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
  const removeLoggedFood = useMacroStore((s) => s.removeLoggedFood)
  const setBurnedCalories = useMacroStore((s) => s.setBurnedCalories)
  const setDailyNote = useMacroStore((s) => s.setDailyNote)
  const updateDailyLog = useMacroStore((s) => s.updateDailyLog)

  const log = getDailyLog(currentDate)
  const goal =
    settings.goalTemplates.find((g) => g.id === log.goalTemplateId) ??
    settings.goalTemplates.find((g) => g.id === settings.defaultTemplateId) ??
    settings.goalTemplates[0]

  const activeTemplateId = log.goalTemplateId || settings.defaultTemplateId

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
  const [noteExpanded, setNoteExpanded] = useState(!!log.note)
  const [burnEditOpen, setBurnEditOpen] = useState(false)
  const [burnInput, setBurnInput] = useState(String(log.burnedCalories))

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

  const addRecipe = (overrides?: { foodId: string; quantity: number }[]) => {
    if (!selectedFood) return
    addLoggedFood({
      foodId: selectedFood.id,
      quantity: 1,
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

        {editDayMode && settings.goalTemplates.length > 0 && (
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
              {settings.goalTemplates.map((t) => (
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Goals vs Remaining</CardTitle>
            <p className="text-xs text-muted-foreground">
              {goal.name} · {goal.calories} cal target
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {METRICS.map(({ key, label, unit }) => {
                const goalVal = goal[key]
                const actual = consumed[key]
                const remaining = goalVal - actual
                return (
                  <div key={key} className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold text-primary">
                      {roundMacro(remaining, key === 'calories' ? 0 : 1)}
                      {unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {roundMacro(actual, 0)} / {goalVal}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">Net Calories</p>
          <p className="text-5xl font-bold tracking-tight text-primary">
            {roundMacro(netCalories, 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {roundMacro(consumed.calories, 0)} eaten − {log.burnedCalories} burned
          </p>
        </div>

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

        <div>
          <h3 className="font-semibold mb-2">Logged foods</h3>
          {log.foods.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-muted-foreground mb-4">No foods logged yet</p>
              {editDayMode && (
                <Button onClick={() => setPickerOpen(true)}>Add your first food</Button>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {log.foods.map((entry) => {
                const food = foodLibrary.find((f) => f.id === entry.foodId)
                const macros = getLoggedFoodMacros(foodLibrary, entry)
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left"
                      onClick={() => editDayMode && setEditLogged(entry)}
                    >
                      <div>
                        <p className="font-medium">
                          {food?.name ?? 'Unknown'}
                          {food?.isRecipe && ' 🍱'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.overriddenComponents
                            ? 'Customized recipe'
                            : food
                              ? formatLoggedFoodQuantity(food, entry)
                              : ''}
                        </p>
                      </div>
                      <span className="text-sm font-medium">{roundMacro(macros.calories, 0)} cal</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {editDayMode && (
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
    </div>
  )
}

function EditLoggedSheet({
  open,
  entry,
  food,
  date,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  entry: LoggedFood | null
  food?: FoodItem
  date: string
  onClose: () => void
  onSave: (patch: Partial<LoggedFood>) => void
  onDelete: () => void
}) {
  const [countQty, setCountQty] = useState(1)
  const [amountEaten, setAmountEaten] = useState(1)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!entry || !food) return
    setNote(entry.note ?? '')
    if (food.scaleType === 'scale') {
      setAmountEaten(
        entry.scaleAmountEaten ??
          amountEatenFromServings(getFoodBaseAmount(food), entry.quantity),
      )
    } else {
      setCountQty(Math.max(1, Math.round(entry.quantity)))
    }
  }, [entry, food])

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
        <QuantityInput
          food={food}
          note={note}
          onNoteChange={setNote}
          countQuantity={countQty}
          onCountQuantityChange={setCountQty}
          amountEaten={amountEaten}
          onAmountEatenChange={setAmountEaten}
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
              })
            } else {
              onSave({
                ...buildScaleLogPayload(food, amountEaten),
                note: note || undefined,
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