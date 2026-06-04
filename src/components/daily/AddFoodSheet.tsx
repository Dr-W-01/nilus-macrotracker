import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { MealPicker } from '@/components/daily/MealPicker'
import { QuantityInput } from '@/components/daily/QuantityInput'
import { buildScaleLogPayload, getFoodBaseAmount } from '@/lib/scale'
import { scaleMacros, roundMacro } from '@/lib/macros'
import type { FoodItem } from '@/lib/types'

export interface AddFoodResult {
  quantity: number
  scaleAmountEaten?: number
  note?: string
  meal: string
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
  const [meal, setMeal] = useState(meals[0] ?? 'Breakfast')

  useEffect(() => {
    if (!food || !open) return
    if (food.scaleType === 'scale') {
      setAmountEaten(getFoodBaseAmount(food))
    } else {
      setCountQty(1)
    }
    setNote('')
    setMeal(meals[0] ?? 'Breakfast')
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
        meal,
      })
      return
    }
    const payload = buildScaleLogPayload(food, amountEaten)
    onAdd({
      ...payload,
      note: note || undefined,
      meal,
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
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{food.name}</SheetTitle>
        </SheetHeader>
        <QuantityInput
          food={food}
          note={note}
          onNoteChange={setNote}
          countQuantity={countQty}
          onCountQuantityChange={setCountQty}
          amountEaten={amountEaten}
          onAmountEatenChange={setAmountEaten}
        />
        {macros && (
          <p className="text-center text-sm text-muted-foreground my-4">
            Total: {roundMacro(macros.calories, 0)} cal · P {roundMacro(macros.protein)} · C{' '}
            {roundMacro(macros.carbs)} · F {roundMacro(macros.fat)}
          </p>
        )}
        <MealPicker
          label="Add to meal"
          meals={meals}
          value={meal}
          onChange={setMeal}
          className="mb-4"
        />
        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={handleAdd} disabled={food.scaleType === 'scale' && amountEaten <= 0}>
            Add to {dateLabel}
          </Button>
          <Button size="lg" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}