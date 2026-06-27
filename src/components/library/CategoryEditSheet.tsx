import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  ModalViewport,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetHeader,
  scrollSheetContentClass,
} from '@/components/ui/scroll-modal'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { itemHasCategory } from '@/lib/categories'
import type { FoodItem } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'

interface CategoryEditSheetProps {
  open: boolean
  category: string | null
  onOpenChange: (open: boolean) => void
}

export function CategoryEditSheet({
  open,
  category,
  onOpenChange,
}: CategoryEditSheetProps) {
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const applyCategoryMembership = useMacroStore((s) => s.applyCategoryMembership)

  const [addSearch, setAddSearch] = useState('')
  const [toAdd, setToAdd] = useState<Set<string>>(new Set())
  const [toRemove, setToRemove] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open || !category) return
    setAddSearch('')
    setToAdd(new Set())
    setToRemove(new Set())
  }, [open, category])

  const members = useMemo(() => {
    if (!category) return []
    return foodLibrary
      .filter((f) => !f.isRecipe && itemHasCategory(f, category))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [foodLibrary, category])

  const addCandidates = useMemo(() => {
    if (!category) return []
    const q = addSearch.trim().toLowerCase()
    return foodLibrary
      .filter((f) => !f.isRecipe && !itemHasCategory(f, category))
      .filter((f) => !q || f.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [foodLibrary, category, addSearch])

  const toggleAdd = (id: string) => {
    setToAdd((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleRemove = (id: string) => {
    setToRemove((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = () => {
    if (!category) return
    applyCategoryMembership(category, [...toAdd], [...toRemove])
    const changes = toAdd.size + toRemove.size
    if (changes > 0) {
      toast.success(`Updated ${changes} item(s) in "${category}"`)
    }
    onOpenChange(false)
  }

  if (!category) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ModalViewport active={open} onRequestClose={() => onOpenChange(false)} />
      <SheetContent
        side="bottom"
        className={scrollSheetContentClass}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollSheetHeader>
          <SheetTitle>Edit category: {category}</SheetTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Add or remove items from this category. Items are not deleted.
          </p>
        </ScrollSheetHeader>

        <ScrollSheetBody className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold mb-2">
              In this category ({members.length})
            </h3>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet.</p>
            ) : (
              <ul className="space-y-1 rounded-lg border border-border divide-y divide-border">
                {members.map((food) => (
                  <MemberRow
                    key={food.id}
                    food={food}
                    markedRemove={toRemove.has(food.id)}
                    onToggle={() => toggleRemove(food.id)}
                  />
                ))}
              </ul>
            )}
            {toRemove.size > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {toRemove.size} marked to remove from category
              </p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2">Add items</h3>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                placeholder="Search foods to add..."
                className="pl-9"
              />
            </div>
            {toAdd.size > 0 && (
              <p className="text-xs text-primary mb-2">{toAdd.size} selected to add</p>
            )}
            {addCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {addSearch.trim()
                  ? 'No matching items outside this category.'
                  : 'All items are already in this category.'}
              </p>
            ) : (
              <ul className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border divide-y divide-border">
                {addCandidates.map((food) => (
                  <label
                    key={food.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5 active:bg-secondary/50"
                  >
                    <Checkbox
                      checked={toAdd.has(food.id)}
                      onChange={() => toggleAdd(food.id)}
                    />
                    <span className="text-sm truncate">{food.name}</span>
                  </label>
                ))}
              </ul>
            )}
          </section>
        </ScrollSheetBody>

        <ScrollSheetFooter>
          <Button size="lg" className="w-full" onClick={handleSave}>
            Save changes
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </ScrollSheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function MemberRow({
  food,
  markedRemove,
  onToggle,
}: {
  food: FoodItem
  markedRemove: boolean
  onToggle: () => void
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 ${
        markedRemove ? 'bg-destructive/10 opacity-70' : 'active:bg-secondary/50'
      }`}
    >
      <Checkbox checked={markedRemove} onChange={onToggle} />
      <span className={`text-sm truncate flex-1 ${markedRemove ? 'line-through' : ''}`}>
        {food.name}
      </span>
      <span className="text-xs text-muted-foreground shrink-0">Remove</span>
    </label>
  )
}