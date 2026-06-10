import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Check,
  FolderInput,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ModalViewport,
  ScrollDialogBody,
  ScrollDialogFooter,
  ScrollDialogHeader,
  scrollDialogContentClass,
} from '@/components/ui/scroll-modal'
import { FoodSearchField } from '@/components/library/FoodSearchField'
import { EditIconButton } from '@/components/ui/edit-icon-button'
import { fuzzyScore, parseFoodSearchQuery, searchFoodItems } from '@/lib/foodSearch'
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
import { BulkAssignCategoryDialog } from '@/components/library/BulkAssignCategoryDialog'
import { CategoryEditSheet } from '@/components/library/CategoryEditSheet'
import { CategoryManageSheet } from '@/components/library/CategoryManageSheet'
import { DeleteCategoryDialog } from '@/components/library/DeleteCategoryDialog'
import { FavoriteFoodButton } from '@/components/library/FavoriteFoodButton'
import { EmptyState } from '@/components/ui/EmptyState'

type BulkDeleteKind = 'items' | 'categories' | 'recipes'

export function LibraryTab() {
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const customCategories = useMacroStore((s) => s.customCategories)
  const librarySegment = useMacroStore((s) => s.librarySegment)
  const setLibrarySegment = useMacroStore((s) => s.setLibrarySegment)
  const loadSeedLibrary = useMacroStore((s) => s.loadSeedLibrary)
  const deleteFoodItems = useMacroStore((s) => s.deleteFoodItems)
  const removeLibraryCategory = useMacroStore((s) => s.removeLibraryCategory)
  const deleteLibraryCategory = useMacroStore((s) => s.deleteLibraryCategory)
  const librarySearchEngaged = useMacroStore((s) => s.librarySearchEngaged)
  const setLibrarySearchEngaged = useMacroStore((s) => s.setLibrarySearchEngaged)

  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false)
  const [newFoodOpen, setNewFoodOpen] = useState(false)
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [categoryEditOpen, setCategoryEditOpen] = useState(false)
  const [categoryManageOpen, setCategoryManageOpen] = useState(false)
  const [deleteCategoryOpen, setDeleteCategoryOpen] = useState(false)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<string | null>(null)

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

  const libraryModalOpen =
    deleteConfirmOpen ||
    bulkCategoryOpen ||
    newFoodOpen ||
    recipeOpen ||
    addCategoryOpen ||
    categoryManageOpen ||
    categoryEditOpen ||
    deleteCategoryOpen ||
    editingFood != null

  useEffect(() => {
    if (libraryModalOpen) {
      setSearchFocused(false)
      setLibrarySearchEngaged(false)
      return
    }
    setLibrarySearchEngaged(searchFocused || query.trim().length > 0)
  }, [libraryModalOpen, searchFocused, query, setLibrarySearchEngaged])

  useEffect(() => {
    return () => setLibrarySearchEngaged(false)
  }, [setLibrarySearchEngaged])

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

    const parsed = parseFoodSearchQuery(query)
    const q = query.trim()
    const allNames = collectAllCategories(foodLibrary, customCategories)

    const entries = allNames
      .map((cat) => {
        if (
          parsed.categoryFilter &&
          fuzzyScore(cat, parsed.categoryFilter) <= 0
        ) {
          return null
        }

        const items = itemsInCategory(foodLibrary, cat)
        if (!q) return [cat, items] as const

        const catMatches =
          fuzzyScore(cat, parsed.text || parsed.categoryFilter || q) > 0
        const { results } = searchFoodItems(items, parsed.text || q)
        if (catMatches) return [cat, items] as const
        if (results.length > 0) return [cat, results] as const
        return null
      })
      .filter((entry): entry is readonly [string, FoodItem[]] => entry != null)

    return entries
  }, [foodLibrary, customCategories, librarySegment, query])

  const filtered = useMemo(() => {
    let list = [...foodLibrary]
    if (librarySegment === 'items') list = list.filter((f) => !f.isRecipe)
    else if (librarySegment === 'recipes') list = list.filter((f) => f.isRecipe)
    else return { type: 'categories' as const }

    const { results } = searchFoodItems(list, query)
    const groups = new Map<string, FoodItem[]>()
    results.forEach((f) => {
      const letter = getLetterGroup(f.name)
      const arr = groups.get(letter) ?? []
      arr.push(f)
      groups.set(letter, arr)
    })
    return { type: 'alpha' as const, groups }
  }, [foodLibrary, librarySegment, query])

  const activeCategoryItems = useMemo(() => {
    if (!activeCategory) return []
    const items = itemsInCategory(foodLibrary, activeCategory)
    return searchFoodItems(items, query).results
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
      <div className="library-tab p-6 pb-below-nav">
        <EmptyState
          icon={BookOpen}
          title="Your food library is empty"
          description="Save foods you eat often so you can log them in one tap from the Daily tab. Add your own items or load the demo library to explore."
          actionLabel="Add your first food"
          onAction={() => setNewFoodOpen(true)}
          secondaryActionLabel={`Load demo library (${SEED_LIBRARY_COUNT} items)`}
          onSecondaryAction={() => {
            loadSeedLibrary()
            toast.success(`Loaded ${SEED_LIBRARY_COUNT} foods`)
          }}
        />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          You can also import a backup from Settings → Data
        </p>
        <NewFoodSheet open={newFoodOpen} onOpenChange={setNewFoodOpen} />
      </div>
    )
  }

  return (
    <div
      className={`library-tab ${librarySearchEngaged ? 'pb-below-nav-search' : 'pb-below-nav'}`}
    >
      <div className="tab-sticky-header">
        <div className="space-y-3 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold">Library</h1>
            {librarySegment === 'categories' && activeCategory ? (
              <EditIconButton
                variant="outline"
                label="Manage category"
                onClick={() => setCategoryManageOpen(true)}
              />
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
          <FoodSearchField
            scope="library"
            placeholder={
              librarySegment === 'categories' && !activeCategory
                ? 'Search categories or items…'
                : librarySegment === 'categories' && activeCategory
                  ? `Search in ${activeCategory}…`
                  : `Search ${librarySegment} by name or tag…`
            }
            value={query}
            onChange={setQuery}
            onSearchFocus={() => setSearchFocused(true)}
            onSearchBlur={() => setSearchFocused(false)}
          />
          {!editMode && librarySegment === 'items' && (
            <div className="tab-action-row">
              <Button className="min-w-0 flex-1" onClick={() => setNewFoodOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New Food
              </Button>
              {showBulkEdit && (
                <EditIconButton
                  variant="outline"
                  className="h-11 w-11 shrink-0"
                  iconClassName="h-5 w-5"
                  label="Edit library"
                  onClick={enterEditMode}
                />
              )}
            </div>
          )}
          {!editMode && librarySegment === 'categories' && !activeCategory && (
            <div className="tab-action-row">
              <Button className="min-w-0 flex-1" onClick={() => setAddCategoryOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New Category
              </Button>
              {showBulkEdit && (
                <EditIconButton
                  variant="outline"
                  className="h-11 w-11 shrink-0"
                  iconClassName="h-5 w-5"
                  label="Edit categories"
                  onClick={enterEditMode}
                />
              )}
            </div>
          )}
          {!editMode && librarySegment === 'recipes' && (
            <div className="tab-action-row">
              <Button className="min-w-0 flex-1" onClick={() => setRecipeOpen(true)}>
                <ChefHat className="h-4 w-4 mr-1" />
                Create Recipe
              </Button>
              {showBulkEdit && (
                <EditIconButton
                  variant="outline"
                  className="h-11 w-11 shrink-0"
                  iconClassName="h-5 w-5"
                  label="Edit recipes"
                  onClick={enterEditMode}
                />
              )}
            </div>
          )}
          {editMode && showBulkEdit && (
            <Button
              variant="default"
              className="h-11 w-full gap-1.5"
              onClick={exitEditMode}
            >
              <Check className="h-4 w-4" />
              Done editing
            </Button>
          )}
        </div>

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
              <div className="flex flex-wrap items-center justify-end gap-2">
                {librarySegment === 'items' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkCategoryOpen(true)}
                  >
                    <FolderInput className="h-4 w-4 mr-1" />
                    Assign category
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={confirmBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
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
                  No items in this category yet. Tap the edit icon to manage items.
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
                  showFavorite={librarySegment === 'items'}
                />
              </section>
            ))
        ) : null}
      </div>

      <BulkAssignCategoryDialog
        open={bulkCategoryOpen}
        onOpenChange={setBulkCategoryOpen}
        selectedIds={[...selected]}
        onAssigned={() => setSelected(new Set())}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <ModalViewport active={deleteConfirmOpen} />
        <DialogContent className={scrollDialogContentClass}>
          <ScrollDialogHeader>
            <DialogTitle>{bulkDeleteTitle}</DialogTitle>
          </ScrollDialogHeader>
          <ScrollDialogBody className="py-2">
            <p className="text-sm text-muted-foreground">{bulkDeleteDescription}</p>
          </ScrollDialogBody>
          <ScrollDialogFooter>
            <Button size="lg" variant="destructive" className="w-full" onClick={handleBulkDelete}>
              {bulkDeleteKind === 'categories' ? 'Remove categories' : 'Delete permanently'}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="w-full"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
          </ScrollDialogFooter>
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
      <CategoryManageSheet
        open={categoryManageOpen}
        category={activeCategory}
        onOpenChange={setCategoryManageOpen}
        onRenamed={(name) => setActiveCategory(name)}
        onEditMembership={() => setCategoryEditOpen(true)}
        onRequestDelete={() => {
          setDeleteCategoryTarget(activeCategory)
          setDeleteCategoryOpen(true)
        }}
      />
      <DeleteCategoryDialog
        open={deleteCategoryOpen}
        category={deleteCategoryTarget}
        itemCount={
          deleteCategoryTarget
            ? itemsInCategory(foodLibrary, deleteCategoryTarget).filter((f) => !f.isRecipe)
                .length
            : 0
        }
        onOpenChange={setDeleteCategoryOpen}
        onUnlinkOnly={() => {
          if (!deleteCategoryTarget) return
          deleteLibraryCategory(deleteCategoryTarget, false)
          toast.success(`Removed category "${deleteCategoryTarget}"`)
          if (activeCategory === deleteCategoryTarget) setActiveCategory(null)
          setDeleteCategoryTarget(null)
          setDeleteCategoryOpen(false)
        }}
        onDeleteItems={() => {
          if (!deleteCategoryTarget) return
          const count = itemsInCategory(foodLibrary, deleteCategoryTarget).filter(
            (f) => !f.isRecipe,
          ).length
          deleteLibraryCategory(deleteCategoryTarget, true)
          toast.success(
            count > 0
              ? `Deleted category and ${count} ${count === 1 ? 'item' : 'items'}`
              : `Removed category "${deleteCategoryTarget}"`,
          )
          if (activeCategory === deleteCategoryTarget) setActiveCategory(null)
          setDeleteCategoryTarget(null)
          setDeleteCategoryOpen(false)
        }}
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
  showFavorite = false,
}: {
  items: FoodItem[]
  editMode: boolean
  selected: Set<string>
  onToggle: (id: string) => void
  onOpenItem: (food: FoodItem) => void
  showFavorite?: boolean
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
              <FoodRowContent food={food} showFavorite={showFavorite} />
            </label>
          ) : (
            <div className="flex items-stretch gap-1 rounded-lg border border-border">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left active:bg-secondary/50"
                onClick={() => onOpenItem(food)}
              >
                <FoodRowContent food={food} showFavorite={false} />
              </button>
              {showFavorite && !food.isRecipe && (
                <FavoriteFoodButton foodId={food.id} className="self-center" />
              )}
              <EditIconButton
                variant="ghost"
                size="icon"
                className="mr-1 self-center h-8 w-8"
                label={`Edit ${food.name}`}
                onClick={() => onOpenItem(food)}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function FoodRowContent({
  food,
  showFavorite: _showFavorite,
}: {
  food: FoodItem
  showFavorite?: boolean
}) {
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