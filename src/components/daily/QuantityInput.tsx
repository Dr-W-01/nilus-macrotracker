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
import { LoggedMacroPreview } from '@/components/daily/LoggedMacroPreview'
import { scaleMacros } from '@/lib/macros'
import type { FoodItem } from '@/lib/types'

interface QuantityInputProps {
  food: FoodItem
  note: string
  onNoteChange: (n: string) => void
  disabled?: boolean
  countQuantity?: number
  onCountQuantityChange?: (q: number) => void
  amountEaten?: number
  onAmountEatenChange?: (amount: number) => void
  showNote?: boolean
  showInlineMacroPreview?: boolean
  /** Compact layout for recipe ingredient editing */
  compact?: boolean
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
  showInlineMacroPreview = true,
  compact = false,
}: QuantityInputProps) {
  const isCount = food.scaleType === 'count'
  const intQty = Math.max(1, Math.round(countQuantity) || 1)
  const base = getFoodBaseAmount(food)
  const unit = getFoodBaseUnit(food)
  const eaten = Number.isFinite(amountEaten) && amountEaten > 0 ? amountEaten : base

  const [amountText, setAmountText] = useState(String(eaten))
  useEffect(() => {
    if (!isCount) setAmountText(String(eaten))
  }, [eaten, food.id, isCount])

  const multiplier = useMemo(
    () => (isCount ? intQty : servingsFromAmountEaten(base, eaten)),
    [isCount, intQty, base, eaten],
  )

  const previewMacros = useMemo(
    () => scaleMacros(food, multiplier),
    [food, multiplier],
  )

  if (isCount) {
    return (
      <div className={compact ? 'space-y-2' : 'space-y-4'}>
        <p
          className={
            compact
              ? 'text-xs text-muted-foreground'
              : 'text-center text-sm text-muted-foreground'
          }
        >
          {food.servingDesc}
        </p>
        <div
          className={
            compact
              ? 'flex items-center justify-center gap-3'
              : 'flex items-center justify-center gap-6'
          }
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={
              compact
                ? 'h-9 w-9 rounded-full'
                : 'h-14 w-14 rounded-full text-2xl'
            }
            disabled={disabled || intQty <= 1}
            onClick={() => onCountQuantityChange?.(Math.max(1, intQty - 1))}
          >
            <Minus className={compact ? 'h-4 w-4' : 'h-6 w-6'} />
          </Button>
          <span
            className={
              compact
                ? 'min-w-[2.5rem] text-center text-2xl font-bold tabular-nums'
                : 'min-w-[4rem] text-center text-5xl font-bold tabular-nums'
            }
          >
            {intQty}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={
              compact
                ? 'h-9 w-9 rounded-full'
                : 'h-14 w-14 rounded-full text-2xl'
            }
            disabled={disabled}
            onClick={() => onCountQuantityChange?.(intQty + 1)}
          >
            <Plus className={compact ? 'h-4 w-4' : 'h-6 w-6'} />
          </Button>
        </div>
        {showInlineMacroPreview && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center">
            <LoggedMacroPreview macros={previewMacros} size="md" />
          </div>
        )}
        {showNote && (
          <NoteField note={note} onNoteChange={onNoteChange} disabled={disabled} />
        )}
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {!compact && (
        <div className="rounded-lg bg-secondary/50 px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground">
            Base serving:{' '}
            <span className="font-semibold text-primary">{formatBaseServing(food)}</span>
          </p>
        </div>
      )}

      <div>
        {!compact && (
          <Label htmlFor="amount-eaten" className="text-sm font-medium">
            Amount eaten
          </Label>
        )}
        <div className={compact ? 'flex items-center gap-2' : 'mt-2 flex items-center justify-center gap-3'}>
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
            className={
              compact
                ? 'h-9 max-w-[100px] text-center text-base font-semibold'
                : 'h-14 max-w-[160px] text-center text-2xl font-bold'
            }
          />
          <span className={compact ? 'text-sm font-medium text-primary' : 'text-xl font-semibold text-primary'}>
            {unit}
          </span>
          {compact && (
            <span className="text-xs text-muted-foreground">
              · {formatBaseServing(food)}
            </span>
          )}
        </div>
      </div>

      <p
        className={
          compact
            ? 'text-xs text-muted-foreground'
            : 'text-center text-sm font-medium text-foreground'
        }
      >
        {formatScaleEatenSummary(food, eaten)}
      </p>

      {showInlineMacroPreview && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center">
          <LoggedMacroPreview macros={previewMacros} size="md" />
        </div>
      )}

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