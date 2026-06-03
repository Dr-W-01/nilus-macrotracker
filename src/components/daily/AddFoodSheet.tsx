import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { QuantityInput } from '@/components/daily/QuantityInput'
import { scaleMacros, roundMacro } from '@/lib/macros'
import type { FoodItem } from '@/lib/types'

interface AddFoodSheetProps {
  open: boolean
  food: FoodItem | null
  date: string
  onOpenChange: (open: boolean) => void
  onAdd: (quantity: number, note: string) => void
  onCancel: () => void
}

export function AddFoodSheet({
  open,
  food,
  date,
  onOpenChange,
  onAdd,
  onCancel,
}: AddFoodSheetProps) {
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')

  if (!food) return null

  const macros = scaleMacros(food, food.scaleType === 'count' ? Math.max(1, Math.round(quantity)) : quantity)
  const dateLabel = format(parseISO(date), 'MMM d, yyyy')

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel()
        onOpenChange(v)
      }}
    >
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{food.name}</SheetTitle>
        </SheetHeader>
        <QuantityInput
          food={food}
          quantity={quantity}
          note={note}
          onQuantityChange={setQuantity}
          onNoteChange={setNote}
        />
        <p className="text-center text-sm text-muted-foreground my-4">
          ≈ {roundMacro(macros.calories, 0)} cal · P {roundMacro(macros.protein)} · C {roundMacro(macros.carbs)} · F {roundMacro(macros.fat)}
        </p>
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            onClick={() => {
              const q = food.scaleType === 'count' ? Math.max(1, Math.round(quantity)) : quantity
              onAdd(q, note)
            }}
          >
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