import { cn } from '@/lib/utils'

interface MealPickerProps {
  meals: string[]
  /** Empty string = no meal selected */
  value: string
  onChange: (meal: string) => void
  label?: string
  compact?: boolean
  className?: string
  /** Allow leaving no meal selected (toggle active meal off). Default true. */
  optional?: boolean
}

export function MealPicker({
  meals,
  value,
  onChange,
  label,
  compact,
  className,
  optional = true,
}: MealPickerProps) {
  const hasSelection = value.trim().length > 0

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <p className="text-xs text-muted-foreground">
          {label}
          {optional && (
            <span className="text-muted-foreground/80"> · optional</span>
          )}
        </p>
      )}
      {optional && !hasSelection && (
        <p className="text-xs text-muted-foreground/90 italic">
          No meal selected — food will be logged without a meal category.
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {meals.map((meal) => {
          const active = hasSelection && meal.toLowerCase() === value.toLowerCase()
          return (
            <button
              key={meal}
              type="button"
              className={cn(
                'rounded-full border px-3 font-medium transition-colors min-h-9',
                compact ? 'text-xs py-1' : 'text-sm py-1.5',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground active:bg-secondary/60',
              )}
              onClick={() => {
                if (optional && active) onChange('')
                else onChange(meal)
              }}
            >
              {meal}
            </button>
          )
        })}
      </div>
    </div>
  )
}