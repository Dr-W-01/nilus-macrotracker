import { useRef } from 'react'
import { Clock, Search, X } from 'lucide-react'
import { LibrarySearchInput } from '@/components/library/LibrarySearchInput'
import { foodSearchHint, parseFoodSearchQuery } from '@/lib/foodSearch'
import type { FoodSearchScope } from '@/lib/foodSearch'
import { useMacroStore } from '@/store/useMacroStore'
import { cn } from '@/lib/utils'

interface FoodSearchFieldProps {
  value: string
  onChange: (value: string) => void
  scope: FoodSearchScope
  placeholder?: string
  className?: string
  onSearchFocus?: () => void
  onSearchBlur?: () => void
}

export function FoodSearchField({
  value,
  onChange,
  scope,
  placeholder = 'Search by name, category, or tag…',
  className,
  onSearchFocus,
  onSearchBlur,
}: FoodSearchFieldProps) {
  const recentSearches = useMacroStore((s) => s.recentFoodSearches[scope])
  const recordFoodSearch = useMacroStore((s) => s.recordFoodSearch)
  const clearRecentFoodSearches = useMacroStore((s) => s.clearRecentFoodSearches)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const parsed = parseFoodSearchQuery(value)
  const hint = foodSearchHint(parsed)
  const showRecent = value.trim().length === 0 && recentSearches.length > 0

  const commitSearch = () => {
    if (value.trim().length >= 2) {
      recordFoodSearch(scope, value)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <LibrarySearchInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-9 [&::-webkit-search-cancel-button]:appearance-none"
          onSearchFocus={onSearchFocus}
          onSearchBlur={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current)
            blurTimer.current = setTimeout(() => {
              commitSearch()
              onSearchBlur?.()
            }, 200)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitSearch()
              e.currentTarget.blur()
            }
          }}
        />
        {value && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
            onClick={() => onChange('')}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {hint && (
        <p className="text-xs text-primary">{hint}</p>
      )}

      {showRecent && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Clock className="h-3 w-3" />
              Recent searches
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => clearRecentFoodSearches(scope)}
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs font-medium text-foreground active:bg-secondary"
                onClick={() => onChange(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/80">
        Tip: use <span className="font-mono">category:protein</span> or{' '}
        <span className="font-mono">#snacks</span> to filter by tag
      </p>
    </div>
  )
}