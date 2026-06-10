import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  ModalViewport,
  ScrollDialogBody,
  ScrollDialogFooter,
  ScrollDialogHeader,
  scrollDialogContentClass,
} from '@/components/ui/scroll-modal'
import { Input } from '@/components/ui/input'
import { FavoriteFoodButton } from '@/components/library/FavoriteFoodButton'
import { useMacroStore } from '@/store/useMacroStore'
import type { FoodItem } from '@/lib/types'

interface FoodPickerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectFood: (food: FoodItem) => void
}

function FoodPickerRow({
  food,
  onSelect,
}: {
  food: FoodItem
  onSelect: (food: FoodItem) => void
}) {
  return (
    <li>
      <div className="flex items-stretch gap-1 rounded-lg border border-border bg-secondary/40">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between px-3 py-3 text-left active:bg-secondary"
          onClick={() => onSelect(food)}
        >
          <div className="min-w-0 pr-2">
            <span className="font-medium">{food.name}</span>
            <p className="truncate text-xs text-muted-foreground">{food.servingDesc}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {food.isRecipe && <Badge variant="secondary">🍱</Badge>}
            <span className="text-sm text-muted-foreground">
              {Math.round(food.caloriesPerServing)} cal
            </span>
          </div>
        </button>
        <FavoriteFoodButton foodId={food.id} className="mr-1 self-center" size="sm" />
      </div>
    </li>
  )
}

/** Full-height dialog picker — search stays visible; list scrolls; Cancel pinned in footer */
export function FoodPickerSheet({ open, onOpenChange, onSelectFood }: FoodPickerSheetProps) {
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const favoriteFoodIds = useMacroStore((s) => s.favoriteFoodIds)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const { favorites, others, total } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const favSet = new Set(favoriteFoodIds)
    const filtered = [...foodLibrary]
      .filter((f) => !q || f.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      favorites: filtered.filter((f) => favSet.has(f.id)),
      others: filtered.filter((f) => !favSet.has(f.id)),
      total: filtered.length,
    }
  }, [foodLibrary, favoriteFoodIds, query])

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => searchRef.current?.focus(), 100)
      return () => window.clearTimeout(t)
    }
    setQuery('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalViewport active={open} />
      <DialogContent className={scrollDialogContentClass}>
        <ScrollDialogHeader>
          <DialogTitle>Add Food</DialogTitle>
        </ScrollDialogHeader>

        <div className="shrink-0 border-b border-border bg-card px-4 py-3 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search foods..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoComplete="off"
              enterKeyHint="search"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {total} {total === 1 ? 'item' : 'items'}
            {favorites.length > 0 && ` · ${favorites.length} favorite${favorites.length === 1 ? '' : 's'}`}
          </p>
        </div>

        <ScrollDialogBody className="pt-2 pb-2">
          {total === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Star className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="text-muted-foreground">No foods found.</p>
              <p className="text-xs text-muted-foreground">
                Add items in Library or load the demo food library from Settings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {favorites.length > 0 && (
                <section>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    Favorites
                  </h3>
                  <ul className="space-y-1">
                    {favorites.map((food) => (
                      <FoodPickerRow key={food.id} food={food} onSelect={onSelectFood} />
                    ))}
                  </ul>
                </section>
              )}
              {others.length > 0 && (
                <section>
                  {favorites.length > 0 && (
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {query.trim() ? 'Other matches' : 'All foods'}
                    </h3>
                  )}
                  <ul className="space-y-1">
                    {others.map((food) => (
                      <FoodPickerRow key={food.id} food={food} onSelect={onSelectFood} />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </ScrollDialogBody>

        <ScrollDialogFooter>
          <Button size="lg" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </ScrollDialogFooter>
      </DialogContent>
    </Dialog>
  )
}