import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MealPicker } from '@/components/daily/MealPicker'

interface BulkMealAssignBarProps {
  count: number
  meals: string[]
  assignMeal: string
  onAssignMealChange: (meal: string) => void
  onAssign: () => void
  onDelete: () => void
  onClear: () => void
  onDone: () => void
}

export function BulkMealAssignBar({
  count,
  meals,
  assignMeal,
  onAssignMealChange,
  onAssign,
  onDelete,
  onClear,
  onDone,
}: BulkMealAssignBarProps) {
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {count > 0
            ? `${count} ${count === 1 ? 'item' : 'items'} selected`
            : 'Tap foods below to select'}
        </span>
        <div className="flex shrink-0 gap-1">
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onClear}>
              Clear
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
      <MealPicker
        label="Assign to meal"
        meals={meals}
        value={assignMeal}
        onChange={onAssignMealChange}
        compact
        optional={false}
      />
      <Button className="w-full h-10" disabled={count === 0} onClick={onAssign}>
        {count > 0 ? `Assign to ${assignMeal}` : 'Select items to assign'}
      </Button>
      <Button
        variant="destructive"
        className="w-full h-10 gap-1.5"
        disabled={count === 0}
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
        Delete Selected
      </Button>
    </div>
  )
}