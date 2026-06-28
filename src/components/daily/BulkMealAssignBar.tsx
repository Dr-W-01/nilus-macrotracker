import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BulkSelectBarProps {
  count: number
  onDelete: () => void
  onClear: () => void
  onDone: () => void
}

export function BulkMealAssignBar({
  count,
  onDelete,
  onClear,
  onDone,
}: BulkSelectBarProps) {
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 space-y-2">
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
      <Button
        variant="destructive"
        className="h-9 w-full gap-1.5"
        disabled={count === 0}
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
        Delete selected
      </Button>
    </div>
  )
}