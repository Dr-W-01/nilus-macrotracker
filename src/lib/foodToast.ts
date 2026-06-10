import { toast } from 'sonner'

const FOOD_TOAST_OPTIONS = {
  duration: 2500,
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