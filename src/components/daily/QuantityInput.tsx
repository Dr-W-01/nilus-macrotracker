import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  formatBaseServing,
  formatScaleEatenSummary,
  getFoodBaseAmount,
  getFoodBaseUnit,
  roundAmount,
  servingsFromAmountEaten,
} from '@/lib/scale'
import { scaleMacros, roundMacro } from '@/lib/macros'
import type { FoodItem } from '@/lib/types'

interface QuantityInputProps {
  food: FoodItem
  note: string
  onNoteChange: (n: string) => void
  disabled?: boolean
  /** Count items: integer quantity */
  countQuantity?: number
  onCountQuantityChange?: (q: number) => void
  /** Scale items: actual amount eaten in food's unit */
  amountEaten?: number
  onAmountEatenChange?: (amount: number) => void
  showNote?: boolean
}

export function QuantityInput({
  food,
  note,
  onNoteChange,
  disabled,
  countQuantity = 1,
  onCountQuantityChange,
  amountEaten = 1,
  onAmountEatenChange,
  showNote = true,
}: QuantityInputProps) {
  if (food.scaleType === 'count') {
    const intQty = Math.max(1, Math.round(countQuantity) || 1)
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">{food.servingDesc}</p>
        <div className="flex items-center justify-center gap-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full text-2xl"
            disabled={disabled || intQty <= 1}
            onClick={() => onCountQuantityChange?.(Math.max(1, intQty - 1))}
          >
            <Minus className="h-6 w-6" />
          </Button>
          <span className="min-w-[4rem] text-center text-5xl font-bold tabular-nums">
            {intQty}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full text-2xl"
            disabled={disabled}
            onClick={() => onCountQuantityChange?.(intQty + 1)}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
        {showNote && (
          <NoteField note={note} onNoteChange={onNoteChange} disabled={disabled} />
        )}
      </div>
    )
  }

  const base = getFoodBaseAmount(food)
  const unit = getFoodBaseUnit(food)
  const eaten = Number.isFinite(amountEaten) && amountEaten > 0 ? amountEaten : base

  const [amountText, setAmountText] = useState(String(eaten))
  useEffect(() => {
    setAmountText(String(eaten))
  }, [eaten, food.id])

  const multiplier = useMemo(
    () => servingsFromAmountEaten(base, eaten),
    [base, eaten],
  )

  const previewMacros = useMemo(
    () => scaleMacros(food, multiplier),
    [food, multiplier],
  )

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-secondary/50 px-4 py-3 text-center">
        <p className="text-sm text-muted-foreground">
          Base serving:{' '}
          <span className="font-semibold text-primary">{formatBaseServing(food)}</span>
        </p>
      </div>

      <div>
        <Label htmlFor="amount-eaten" className="text-sm font-medium">
          Amount eaten
        </Label>
        <div className="mt-2 flex items-center justify-center gap-3">
          <Input
            id="amount-eaten"
            type="number"
            inputMode="decimal"
            step={0.01}
            min={0.01}
            disabled={disabled}
            value={amountText}
            onChange={(e) => {
              const raw = e.target.value
              setAmountText(raw)
              const v = parseFloat(raw)
              if (!Number.isNaN(v) && v > 0) {
                onAmountEatenChange?.(roundAmount(v))
              }
            }}
            onBlur={() => {
              const v = parseFloat(amountText)
              if (Number.isNaN(v) || v <= 0) {
                setAmountText(String(base))
                onAmountEatenChange?.(base)
              } else {
                setAmountText(String(roundAmount(v)))
              }
            }}
            className="h-14 max-w-[160px] text-center text-2xl font-bold"
          />
          <span className="text-xl font-semibold text-primary">{unit}</span>
        </div>
      </div>

      <p className="text-center text-sm font-medium text-foreground">
        {formatScaleEatenSummary(food, eaten)}
      </p>

      <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm">
        <span className="text-muted-foreground">≈ </span>
        {roundMacro(previewMacros.calories, 0)} cal · P {roundMacro(previewMacros.protein)} · C{' '}
        {roundMacro(previewMacros.carbs)} · F {roundMacro(previewMacros.fat)}
      </div>

      {showNote && (
        <NoteField note={note} onNoteChange={onNoteChange} disabled={disabled} />
      )}
    </div>
  )
}

function NoteField({
  note,
  onNoteChange,
  disabled,
}: {
  note: string
  onNoteChange: (n: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="food-note">Note (optional)</Label>
      <Textarea
        id="food-note"
        placeholder="Add a note..."
        value={note}
        disabled={disabled}
        onChange={(e) => onNoteChange(e.target.value)}
        rows={2}
      />
    </div>
  )
}