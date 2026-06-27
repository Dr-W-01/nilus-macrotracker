import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { FormSection } from '@/components/ui/form-section'
import {
  ModalViewport,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetHeader,
  scrollSheetContentClass,
} from '@/components/ui/scroll-modal'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { LoggedMacroPreview } from '@/components/daily/LoggedMacroPreview'
import { MealPicker } from '@/components/daily/MealPicker'
import { FoodNoteField, QuantityInput } from '@/components/daily/QuantityInput'
import { buildScaleLogPayload, getFoodBaseAmount } from '@/lib/scale'
import { scaleMacros, roundMacro } from '@/lib/macros'
import type { FoodItem } from '@/lib/types'

export interface AddFoodResult {
  quantity: number
  scaleAmountEaten?: number
  note?: string
  meal?: string
}

interface AddFoodSheetProps {
  open: boolean
  food: FoodItem | null
  meals: string[]
  date: string
  onOpenChange: (open: boolean) => void
  onAdd: (result: AddFoodResult) => void
  onCancel: () => void
}

export function AddFoodSheet({
  open,
  food,
  meals,
  date,
  onOpenChange,
  onAdd,
  onCancel,
}: AddFoodSheetProps) {
  const [countQty, setCountQty] = useState(1)
  const [amountEaten, setAmountEaten] = useState(1)
  const [note, setNote] = useState('')
  const [meal, setMeal] = useState('')

  useEffect(() => {
    if (!food || !open) return
    if (food.scaleType === 'scale') {
      setAmountEaten(getFoodBaseAmount(food))
    } else {
      setCountQty(1)
    }
    setNote('')
    setMeal('')
  }, [food, open, meals])

  const macros = useMemo(() => {
    if (!food) return null
    if (food.scaleType === 'count') {
      return scaleMacros(food, Math.max(1, Math.round(countQty)))
    }
    const mult =
      amountEaten > 0
        ? amountEaten / getFoodBaseAmount(food)
        : 1
    return scaleMacros(food, mult)
  }, [food, countQty, amountEaten])

  if (!food) return null

  const dateLabel = format(parseISO(date), 'MMM d, yyyy')

  const handleAdd = () => {
    if (food.scaleType === 'count') {
      onAdd({
        quantity: Math.max(1, Math.round(countQty)),
        note: note || undefined,
        meal: meal || undefined,
      })
      return
    }
    const payload = buildScaleLogPayload(food, amountEaten)
    onAdd({
      ...payload,
      note: note || undefined,
      meal: meal || undefined,
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel()
        onOpenChange(v)
      }}
    >
      <ModalViewport active={open} onRequestClose={() => onOpenChange(false)} />
      <SheetContent
        side="bottom"
        className={scrollSheetContentClass}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollSheetHeader>
          <SheetTitle>{food.name}</SheetTitle>
          <p className="text-xs font-normal text-muted-foreground">
            Add to {dateLabel}
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
          {macros && (
            <div className="text-center">
              <p className="text-lg font-bold text-primary tabular-nums">
                {roundMacro(macros.calories, 0)} cal
              </p>
              <LoggedMacroPreview macros={macros} size="md" className="mt-0.5" />
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
          <Button
            size="lg"
            className="w-full"
            onClick={handleAdd}
            disabled={food.scaleType === 'scale' && amountEaten <= 0}
          >
            Add to {dateLabel}
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        </ScrollSheetFooter>
      </SheetContent>
    </Sheet>
  )
}