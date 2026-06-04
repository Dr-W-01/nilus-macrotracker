import { Button } from '@/components/ui/button'
import { MealPicker } from '@/components/daily/MealPicker'

interface BulkMealAssignBarProps {
  count: number
  meals: string[]
  assignMeal: string
  onAssignMealChange: (meal: string) => void
  onAssign: () => void
  onClear: () => void
  onDone: () => void
}

export function BulkMealAssignBar({
  count,
  meals,
  assignMeal,
  onAssignMealChange,
  onAssign,
  onClear,
  onDone,
}: BulkMealAssignBarProps) {
  if (count === 0) return null

  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 mx-3 rounded-xl border border-primary/40 bg-card/95 backdrop-blur shadow-lg p-3 space-y-2 safe-bottom">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {count} {count === 1 ? 'item' : 'items'} selected
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={onDone}>
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
      />
      <Button className="w-full" onClick={onAssign}>
        Assign to {assignMeal}
      </Button>
    </div>
  )
}