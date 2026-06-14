import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMacroStore } from '@/store/useMacroStore'

interface FavoriteFoodButtonProps {
  foodId: string
  className?: string
  size?: 'sm' | 'md'
}

export function FavoriteFoodButton({
  foodId,
  className,
  size = 'md',
}: FavoriteFoodButtonProps) {
  const favoriteFoodIds = useMacroStore((s) => s.favoriteFoodIds)
  const toggleFavoriteFood = useMacroStore((s) => s.toggleFavoriteFood)
  const isFavorite = favoriteFoodIds.includes(foodId)
  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <button
      type="button"
      className={cn(
        'shrink-0 rounded-md p-1.5 text-foreground/60 transition-colors hover:bg-secondary/60 hover:text-amber-400 active:scale-95',
        isFavorite && 'text-amber-400',
        className,
      )}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={isFavorite}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavoriteFood(foodId)
      }}
    >
      <Star className={cn(iconClass, isFavorite && 'fill-current')} />
    </button>
  )
}