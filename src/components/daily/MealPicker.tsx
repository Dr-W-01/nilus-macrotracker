import { cn } from '@/lib/utils'

interface MealPickerProps {
  meals: string[]
  value: string
  onChange: (meal: string) => void
  label?: string
  compact?: boolean
  className?: string
}

export function MealPicker({
  meals,
  value,
  onChange,
  label,
  compact,
  className,
}: MealPickerProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <p className="text-xs text-muted-foreground">{label}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {meals.map((meal) => {
          const active = meal.toLowerCase() === value.toLowerCase()
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
              onClick={() => onChange(meal)}
            >
              {meal}
            </button>
          )
        })}
      </div>
    </div>
  )
}