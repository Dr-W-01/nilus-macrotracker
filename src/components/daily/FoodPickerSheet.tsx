import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
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
import { useMacroStore } from '@/store/useMacroStore'
import type { FoodItem } from '@/lib/types'

interface FoodPickerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectFood: (food: FoodItem) => void
}

/** Full-height dialog picker — search stays visible; list scrolls; Cancel pinned in footer */
export function FoodPickerSheet({ open, onOpenChange, onSelectFood }: FoodPickerSheetProps) {
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...foodLibrary]
      .filter((f) => !q || f.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [foodLibrary, query])

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
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        <ScrollDialogBody className="pt-2 pb-2">
          {items.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              No foods found. Add items in Library or load the seed library.
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3 text-left active:bg-secondary"
                    onClick={() => onSelectFood(food)}
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
                </li>
              ))}
            </ul>
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