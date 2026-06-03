import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChefHat, ChevronLeft, ChevronRight, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SEED_LIBRARY_COUNT } from '@/data/seedLibrary'
import { getLetterGroup } from '@/lib/dates'
import { formatBaseServing } from '@/lib/scale'
import type { FoodItem } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'
import { NewFoodSheet } from '@/components/library/NewFoodSheet'
import { EditFoodSheet } from '@/components/library/EditFoodSheet'
import { CreateRecipeSheet } from '@/components/library/CreateRecipeSheet'

export function LibraryTab() {
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const librarySegment = useMacroStore((s) => s.librarySegment)
  const setLibrarySegment = useMacroStore((s) => s.setLibrarySegment)
  const loadSeedLibrary = useMacroStore((s) => s.loadSeedLibrary)
  const deleteFoodItems = useMacroStore((s) => s.deleteFoodItems)

  const [query, setQuery] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [newFoodOpen, setNewFoodOpen] = useState(false)
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    setActiveCategory(null)
  }, [librarySegment])

  const categoryGroups = useMemo(() => {
    if (librarySegment !== 'categories') return null

    const q = query.trim().toLowerCase()
    const list = foodLibrary.filter((f) => !f.isRecipe)
    const cats = new Map<string, FoodItem[]>()

    list.forEach((f) => {
      const itemCategories =
        f.categories.length > 0 ? f.categories : ['General']
      itemCategories.forEach((cat) => {
        const arr = cats.get(cat) ?? []
        if (!arr.some((x) => x.id === f.id)) {
          arr.push(f)
        }
        cats.set(cat, arr)
      })
    })

    const entries = [...cats.entries()]
      .map(([cat, items]) => {
        const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))
        if (!q) return [cat, sorted] as const
        const catMatches = cat.toLowerCase().includes(q)
        const matched = sorted.filter((f) => f.name.toLowerCase().includes(q))
        if (catMatches) return [cat, sorted] as const
        if (matched.length > 0) return [cat, matched] as const
        return null
      })
      .filter((entry): entry is readonly [string, FoodItem[]] => entry != null)
      .sort(([a], [b]) => a.localeCompare(b))

    return entries
  }, [foodLibrary, librarySegment, query])

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
    if (!activeCategory || !categoryGroups) return []
    const entry = categoryGroups.find(([cat]) => cat === activeCategory)
    return entry?.[1] ?? []
  }, [activeCategory, categoryGroups])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = () => {
    if (selected.size === 0) return
    const count = selected.size
    deleteFoodItems([...selected])
    setSelected(new Set())
    setEditMode(false)
    toast.success(`Deleted ${count} item(s)`)
  }

  if (foodLibrary.length === 0) {
    return (
      <div className="p-6 pb-24 text-center space-y-6">
        <BookOpen className="h-16 w-16 mx-auto text-primary opacity-80" />
        <h2 className="text-xl font-semibold">Your food library is empty</h2>
        <p className="text-muted-foreground">
          Load the built-in library or import your own foods.
        </p>
        <Button size="lg" className="w-full max-w-sm mx-auto" onClick={() => {
          loadSeedLibrary()
          toast.success(`Loaded ${SEED_LIBRARY_COUNT} foods`)
        }}>
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
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Library</h1>
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setEditMode(!editMode)
                setSelected(new Set())
              }}
            >
              {editMode ? 'Done' : 'Edit'}
            </Button>
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
              onClick={() => setActiveCategory(null)}
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
                  : `Search ${librarySegment}...`
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {!editMode && (
            <div className="flex gap-2">
              <Button className="flex-1" size="sm" onClick={() => setNewFoodOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Food
              </Button>
              <Button className="flex-1" size="sm" variant="outline" onClick={() => setRecipeOpen(true)}>
                <ChefHat className="h-4 w-4 mr-1" /> Create Recipe
              </Button>
            </div>
          )}
        </header>

        {editMode && (
          <div
            className={`border-b border-border px-4 py-3 flex items-center justify-between gap-3 ${
              selected.size > 0
                ? 'bg-destructive/15 border-destructive/40'
                : 'bg-secondary/40'
            }`}
          >
            <span className="text-sm font-medium">
              {selected.size > 0 ? `${selected.size} selected` : 'Select items to delete'}
            </span>
            {selected.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
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
                  No items match your search in this category.
                </p>
              ) : (
                <FoodList
                  items={activeCategoryItems}
                  editMode={editMode}
                  selected={selected}
                  onToggle={toggleSelect}
                  onOpenItem={(food) => setEditingFood(food)}
                />
              )}
            </section>
          ) : categoryGroups.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No categories match your search.
            </p>
          ) : (
            <ul className="space-y-1">
              {categoryGroups.map(([cat, items]) => (
                <li key={cat}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left active:bg-secondary/50"
                    onClick={() => {
                      setActiveCategory(cat)
                      setQuery('')
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cat}</p>
                      <p className="text-xs text-muted-foreground">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
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

      <NewFoodSheet open={newFoodOpen} onOpenChange={setNewFoodOpen} />
      <EditFoodSheet food={editingFood} onClose={() => setEditingFood(null)} />
      <CreateRecipeSheet open={recipeOpen} onOpenChange={setRecipeOpen} />
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