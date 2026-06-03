import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChefHat, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SEED_LIBRARY_COUNT } from '@/data/seedLibrary'
import { collectAllCategories, itemsInCategory } from '@/lib/categories'
import { getLetterGroup } from '@/lib/dates'
import { formatBaseServing } from '@/lib/scale'
import type { FoodItem } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'
import { NewFoodSheet } from '@/components/library/NewFoodSheet'
import { EditFoodSheet } from '@/components/library/EditFoodSheet'
import { CreateRecipeSheet } from '@/components/library/CreateRecipeSheet'
import { AddCategoryDialog } from '@/components/library/AddCategoryDialog'
import { CategoryEditSheet } from '@/components/library/CategoryEditSheet'

type BulkDeleteKind = 'items' | 'categories' | 'recipes'

export function LibraryTab() {
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const customCategories = useMacroStore((s) => s.customCategories)
  const librarySegment = useMacroStore((s) => s.librarySegment)
  const setLibrarySegment = useMacroStore((s) => s.setLibrarySegment)
  const loadSeedLibrary = useMacroStore((s) => s.loadSeedLibrary)
  const deleteFoodItems = useMacroStore((s) => s.deleteFoodItems)
  const removeLibraryCategory = useMacroStore((s) => s.removeLibraryCategory)

  const [query, setQuery] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [newFoodOpen, setNewFoodOpen] = useState(false)
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [categoryEditOpen, setCategoryEditOpen] = useState(false)

  const exitEditMode = () => {
    setEditMode(false)
    setSelected(new Set())
  }

  const enterEditMode = () => {
    setEditMode(true)
    setSelected(new Set())
  }

  const showBulkEdit =
    librarySegment === 'items' ||
    librarySegment === 'recipes' ||
    (librarySegment === 'categories' && !activeCategory)

  const bulkDeleteKind: BulkDeleteKind =
    librarySegment === 'categories'
      ? 'categories'
      : librarySegment === 'recipes'
        ? 'recipes'
        : 'items'

  useEffect(() => {
    setActiveCategory(null)
    setCategoryEditOpen(false)
    setEditMode(false)
    setSelected(new Set())
  }, [librarySegment])

  useEffect(() => {
    if (!activeCategory) {
      setCategoryEditOpen(false)
      return
    }
    setEditMode(false)
    setSelected(new Set())
  }, [activeCategory])

  const categoryGroups = useMemo(() => {
    if (librarySegment !== 'categories') return null

    const q = query.trim().toLowerCase()
    const allNames = collectAllCategories(foodLibrary, customCategories)

    const entries = allNames
      .map((cat) => {
        const items = itemsInCategory(foodLibrary, cat)
        if (!q) return [cat, items] as const
        const catMatches = cat.toLowerCase().includes(q)
        const matched = items.filter((f) => f.name.toLowerCase().includes(q))
        if (catMatches) return [cat, items] as const
        if (matched.length > 0) return [cat, matched] as const
        return null
      })
      .filter((entry): entry is readonly [string, FoodItem[]] => entry != null)

    return entries
  }, [foodLibrary, customCategories, librarySegment, query])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = [...foodLibrary]
    if (librarySegment === 'items') list = list.filter((f) => !f.isRecipe)
    else if (librarySegment === 'recipes') list = list.filter((f) => f.isRecipe)
    else return { type: 'categories' as const }

    if (q) list = list.filter((f) => f.name.toLowerCase().includes(q))
    list.sort((a, b) => a.name.localeCompare(b.name))
    const groups = new Map<string, FoodItem[]>()
    list.forEach((f) => {
      const letter = getLetterGroup(f.name)
      const arr = groups.get(letter) ?? []
      arr.push(f)
      groups.set(letter, arr)
    })
    return { type: 'alpha' as const, groups }
  }, [foodLibrary, librarySegment, query])

  const activeCategoryItems = useMemo(() => {
    if (!activeCategory) return []
    return itemsInCategory(foodLibrary, activeCategory).filter((f) => {
      const q = query.trim().toLowerCase()
      return !q || f.name.toLowerCase().includes(q)
    })
  }, [activeCategory, foodLibrary, query])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirmBulkDelete = () => {
    if (selected.size === 0) return
    setDeleteConfirmOpen(true)
  }

  const handleBulkDelete = () => {
    const count = selected.size
    if (count === 0) return

    if (bulkDeleteKind === 'categories') {
      ;[...selected].forEach((name) => removeLibraryCategory(name))
      toast.success(
        `Removed ${count} ${count === 1 ? 'category' : 'categories'} (items kept)`,
      )
    } else {
      deleteFoodItems([...selected])
      toast.success(`Deleted ${count} ${count === 1 ? 'item' : 'items'}`)
    }

    setDeleteConfirmOpen(false)
    exitEditMode()
  }

  const bulkDeleteTitle =
    bulkDeleteKind === 'categories'
      ? `Remove ${selected.size} ${selected.size === 1 ? 'category' : 'categories'}?`
      : `Delete ${selected.size} selected ${bulkDeleteKind === 'recipes' ? 'recipe' : 'item'}${selected.size === 1 ? '' : 's'}?`

  const bulkDeleteDescription =
    bulkDeleteKind === 'categories'
      ? 'Category tags will be removed from your library. Food items are not deleted.'
      : 'This permanently removes the selected entries from your library. Logged entries may show as unknown.'

  const bulkSelectHint =
    bulkDeleteKind === 'categories'
      ? 'Select categories to remove'
      : bulkDeleteKind === 'recipes'
        ? 'Select recipes to delete'
        : 'Select items to delete'

  if (foodLibrary.length === 0) {
    return (
      <div className="p-6 pb-24 text-center space-y-6">
        <BookOpen className="h-16 w-16 mx-auto text-primary opacity-80" />
        <h2 className="text-xl font-semibold">Your food library is empty</h2>
        <p className="text-muted-foreground">
          Load the built-in library or import your own foods.
        </p>
        <Button
          size="lg"
          className="w-full max-w-sm mx-auto"
          onClick={() => {
            loadSeedLibrary()
            toast.success(`Loaded ${SEED_LIBRARY_COUNT} foods`)
          }}
        >
          Load Demo Food Library ({SEED_LIBRARY_COUNT} items)
        </Button>
        <p className="text-xs text-muted-foreground">
          Or import from Settings → Data
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-28">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <header className="border-b border-border p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold">Library</h1>
            {librarySegment === 'categories' && activeCategory ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCategoryEditOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit Category
              </Button>
            ) : showBulkEdit ? (
              <Button
                variant={editMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => (editMode ? exitEditMode() : enterEditMode())}
              >
                {editMode ? 'Done' : 'Edit'}
              </Button>
            ) : null}
          </div>
          <Tabs
            value={librarySegment}
            onValueChange={(v) => setLibrarySegment(v as typeof librarySegment)}
          >
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="recipes">Recipes</TabsTrigger>
            </TabsList>
          </Tabs>
          {librarySegment === 'categories' && activeCategory && (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 w-fit gap-1 px-2 text-primary"
              onClick={() => {
                setActiveCategory(null)
                setQuery('')
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              All categories
            </Button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                librarySegment === 'categories' && !activeCategory
                  ? 'Search categories...'
                  : librarySegment === 'categories' && activeCategory
                    ? `Search in ${activeCategory}...`
                    : `Search ${librarySegment}...`
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {!editMode && librarySegment === 'items' && (
            <Button className="w-full" size="sm" onClick={() => setNewFoodOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Food
            </Button>
          )}
          {!editMode && librarySegment === 'categories' && !activeCategory && (
            <Button className="w-full" size="sm" onClick={() => setAddCategoryOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Category
            </Button>
          )}
          {!editMode && librarySegment === 'recipes' && (
            <Button className="w-full" size="sm" onClick={() => setRecipeOpen(true)}>
              <ChefHat className="h-4 w-4 mr-1" />
              Create Recipe
            </Button>
          )}
        </header>

        {editMode && showBulkEdit && (
          <div
            className={`border-b border-border px-4 py-3 flex items-center justify-between gap-3 ${
              selected.size > 0
                ? 'bg-destructive/15 border-destructive/40'
                : 'bg-secondary/40'
            }`}
          >
            <span className="text-sm font-medium shrink-0">
              {selected.size > 0 ? `${selected.size} selected` : bulkSelectHint}
            </span>
            {selected.size > 0 && (
              <Button variant="destructive" size="sm" onClick={confirmBulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pt-2">
        {librarySegment === 'categories' && categoryGroups ? (
          activeCategory ? (
            <section>
              <h2 className="py-2 text-sm font-bold text-primary">{activeCategory}</h2>
              {activeCategoryItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No items in this category yet. Tap Edit Category to add items.
                </p>
              ) : (
                <FoodList
                  items={activeCategoryItems}
                  editMode={false}
                  selected={selected}
                  onToggle={toggleSelect}
                  onOpenItem={(food) => setEditingFood(food)}
                />
              )}
            </section>
          ) : categoryGroups.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-muted-foreground">
                {query.trim()
                  ? 'No categories match your search.'
                  : 'No categories yet. Create one to organize your foods.'}
              </p>
            </div>
          ) : (
            <CategoryList
              groups={categoryGroups}
              editMode={editMode}
              selected={selected}
              onToggle={toggleSelect}
              onOpenCategory={(cat) => {
                setActiveCategory(cat)
                setQuery('')
              }}
            />
          )
        ) : filtered.type === 'alpha' ? (
          [...filtered.groups.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([letter, items]) => (
              <section key={letter}>
                <h2 className="sticky-letter py-2 text-sm font-bold text-primary">{letter}</h2>
                <FoodList
                  items={items}
                  editMode={editMode}
                  selected={selected}
                  onToggle={toggleSelect}
                  onOpenItem={(food) => setEditingFood(food)}
                />
              </section>
            ))
        ) : null}
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{bulkDeleteTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{bulkDeleteDescription}</p>
          <Button variant="destructive" className="w-full" onClick={handleBulkDelete}>
            {bulkDeleteKind === 'categories' ? 'Remove categories' : 'Delete permanently'}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setDeleteConfirmOpen(false)}
          >
            Cancel
          </Button>
        </DialogContent>
      </Dialog>

      <NewFoodSheet open={newFoodOpen} onOpenChange={setNewFoodOpen} />
      <EditFoodSheet food={editingFood} onClose={() => setEditingFood(null)} />
      <CreateRecipeSheet open={recipeOpen} onOpenChange={setRecipeOpen} />
      <AddCategoryDialog
        open={addCategoryOpen}
        onOpenChange={setAddCategoryOpen}
        onCreated={(name) => setActiveCategory(name)}
      />
      <CategoryEditSheet
        open={categoryEditOpen}
        category={activeCategory}
        onOpenChange={setCategoryEditOpen}
      />
    </div>
  )
}

function CategoryList({
  groups,
  editMode,
  selected,
  onToggle,
  onOpenCategory,
}: {
  groups: readonly (readonly [string, FoodItem[]])[]
  editMode: boolean
  selected: Set<string>
  onToggle: (name: string) => void
  onOpenCategory: (name: string) => void
}) {
  return (
    <ul className="space-y-1 mb-4">
      {groups.map(([cat, items]) => (
        <li key={cat}>
          {editMode ? (
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-3 active:bg-secondary/50">
              <Checkbox
                checked={selected.has(cat)}
                onChange={() => onToggle(cat)}
              />
              <CategoryRowContent name={cat} itemCount={items.length} />
            </label>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left active:bg-secondary/50"
              onClick={() => onOpenCategory(cat)}
            >
              <CategoryRowContent name={cat} itemCount={items.length} />
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function CategoryRowContent({
  name,
  itemCount,
}: {
  name: string
  itemCount: number
}) {
  return (
    <div className="flex-1 min-w-0">
      <p className="font-medium truncate">{name}</p>
      <p className="text-xs text-muted-foreground">
        {itemCount} {itemCount === 1 ? 'item' : 'items'}
      </p>
    </div>
  )
}

function FoodList({
  items,
  editMode,
  selected,
  onToggle,
  onOpenItem,
}: {
  items: FoodItem[]
  editMode: boolean
  selected: Set<string>
  onToggle: (id: string) => void
  onOpenItem: (food: FoodItem) => void
}) {
  return (
    <ul className="space-y-1 mb-4">
      {items.map((food) => (
        <li key={food.id}>
          {editMode ? (
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-3 active:bg-secondary/50">
              <Checkbox
                checked={selected.has(food.id)}
                onChange={() => onToggle(food.id)}
              />
              <FoodRowContent food={food} />
            </label>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left active:bg-secondary/50"
              onClick={() => onOpenItem(food)}
            >
              <FoodRowContent food={food} />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function FoodRowContent({ food }: { food: FoodItem }) {
  return (
    <>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {food.name} {food.isRecipe && '🍱'}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {food.scaleType === 'scale'
            ? `Base: ${formatBaseServing(food)} · ${food.servingDesc}`
            : food.servingDesc}
        </p>
      </div>
      <span className="text-sm text-muted-foreground shrink-0">
        {Math.round(food.caloriesPerServing)} cal
      </span>
    </>
  )
}