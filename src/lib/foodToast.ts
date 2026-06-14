import { toast } from 'sonner'

const FOOD_TOAST_OPTIONS = {
  duration: 2200,
  classNames: {
    toast: 'text-sm',
    title: 'text-sm font-medium',
  },
} as const

export function toastFoodAdded(name: string): void {
  toast.success(`Added ${name}`, FOOD_TOAST_OPTIONS)
}

export function toastFoodUpdated(name?: string): void {
  toast.success(name ? `Updated ${name}` : 'Food updated', FOOD_TOAST_OPTIONS)
}

export function toastFoodRemoved(name?: string): void {
  toast.success(name ? `Removed ${name}` : 'Food removed', FOOD_TOAST_OPTIONS)
}

export function toastMealAssigned(meal: string, foodName?: string): void {
  toast.success(
    foodName ? `${foodName} → ${meal}` : `Assigned to ${meal}`,
    FOOD_TOAST_OPTIONS,
  )
}