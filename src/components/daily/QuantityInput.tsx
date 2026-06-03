import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { FoodItem } from '@/lib/types'

interface QuantityInputProps {
  food: FoodItem
  quantity: number
  note: string
  onQuantityChange: (q: number) => void
  onNoteChange: (n: string) => void
  disabled?: boolean
}

export function QuantityInput({
  food,
  quantity,
  note,
  onQuantityChange,
  onNoteChange,
  disabled,
}: QuantityInputProps) {
  if (food.scaleType === 'count') {
    const intQty = Math.max(1, Math.round(quantity) || 1)
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
            onClick={() => onQuantityChange(Math.max(1, intQty - 1))}
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
            onClick={() => onQuantityChange(intQty + 1)}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
        <NoteField note={note} onNoteChange={onNoteChange} disabled={disabled} />
      </div>
    )
  }

  const step = 0.01
  const displayQty = Number.isFinite(quantity) ? quantity : 1

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">{food.servingDesc}</p>
      <div className="flex items-center justify-center gap-3">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          min={0.01}
          disabled={disabled}
          value={displayQty}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!Number.isNaN(v)) {
              onQuantityChange(Math.round(v * 100) / 100)
            }
          }}
          className="h-14 max-w-[140px] text-center text-2xl font-bold"
        />
        <Label className="text-xl font-semibold text-primary">{food.unit ?? 'g'}</Label>
      </div>
      <NoteField note={note} onNoteChange={onNoteChange} disabled={disabled} />
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