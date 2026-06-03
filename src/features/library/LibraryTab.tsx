import { useMemo, useState } from 'react'
import { BookOpen, ChefHat, Plus, Search, Trash2 } from 'lucide-react'
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = [...foodLibrary]
    if (librarySegment === 'items') list = list.filter((f) => !f.isRecipe)
    else if (librarySegment === 'recipes') list = list.filter((f) => f.isRecipe)
    if (librarySegment === 'categories') {
      const cats = new Map<string, FoodItem[]>()
      list.forEach((f) => {
        f.categories.forEach((cat) => {
          if (!q || cat.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)) {
            const arr = cats.get(cat) ?? []
            arr.push(f)
            cats.set(cat, arr)
          }
        })
      })
      return { type: 'categories' as const, cats }
    }
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
    deleteFoodItems([...selected])
    setSelected(new Set())
    setEditMode(false)
    toast.success(`Deleted ${selected.size} item(s)`)
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
          Load My Food Library ({SEED_LIBRARY_COUNT} items)
        </Button>
        <p className="text-xs text-muted-foreground">
          Or import from Settings → Data
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-28">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border p-4 space-y-3">
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
        <Tabs value={librarySegment} onValueChange={(v) => setLibrarySegment(v as typeof librarySegment)}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${librarySegment}...`}
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

      {editMode && selected.size > 0 && (
        <div className="sticky top-[220px] z-10 mx-4 mb-2 flex items-center justify-between rounded-lg bg-destructive/20 border border-destructive px-4 py-3">
          <span>{selected.size} selected</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
          </Button>
        </div>
      )}

      <div className="px-4">
        {filtered.type === 'categories' ? (
          [...filtered.cats.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cat, items]) => (
              <section key={cat} className="mb-6">
                <h2 className="sticky-letter py-2 text-sm font-bold text-primary">{cat}</h2>
                <FoodList
                  items={items}
                  editMode={editMode}
                  selected={selected}
                  onToggle={toggleSelect}
                  onOpenItem={(food) => setEditingFood(food)}
                />
              </section>
            ))
        ) : (
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
        )}
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
            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-3">
              <Checkbox
                checked={selected.has(food.id)}
                onChange={() => onToggle(food.id)}
              />
              <FoodRowContent food={food} />
            </div>
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