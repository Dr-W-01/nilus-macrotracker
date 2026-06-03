import { useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { normalizeCategoryList } from '@/lib/categories'
import { useMacroStore } from '@/store/useMacroStore'

interface CategoryPickerProps {
  selected: string[]
  allCategories: string[]
  onChange: (categories: string[]) => void
}

export function CategoryPicker({
  selected,
  allCategories,
  onChange,
}: CategoryPickerProps) {
  const addLibraryCategory = useMacroStore((s) => s.addLibraryCategory)
  const [search, setSearch] = useState('')
  const [newCategory, setNewCategory] = useState('')

  const registerCategory = (tag: string) => {
    addLibraryCategory(tag)
  }

  const selectedNormalized = normalizeCategoryList(selected)

  const available = useMemo(() => {
    const selectedKeys = new Set(selectedNormalized.map((c) => c.toLowerCase()))
    const q = search.trim().toLowerCase()
    return allCategories
      .filter((c) => !selectedKeys.has(c.toLowerCase()))
      .filter((c) => !q || c.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b))
  }, [allCategories, selectedNormalized, search])

  const toggleCategory = (cat: string) => {
    const key = cat.toLowerCase()
    if (selectedNormalized.some((c) => c.toLowerCase() === key)) {
      onChange(selectedNormalized.filter((c) => c.toLowerCase() !== key))
    } else {
      registerCategory(cat)
      onChange(normalizeCategoryList([...selectedNormalized, cat]))
    }
  }

  const addNewCategory = () => {
    const tag = normalizeCategoryList([newCategory])[0]
    if (!tag) return
    registerCategory(tag)
    if (!selectedNormalized.some((c) => c.toLowerCase() === tag.toLowerCase())) {
      onChange(normalizeCategoryList([...selectedNormalized, tag]))
    }
    setNewCategory('')
    setSearch('')
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground">Categories</Label>

      {selectedNormalized.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedNormalized.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-sm">
              {tag}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-background/50"
                aria-label={`Remove ${tag}`}
                onClick={() => toggleCategory(tag)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No categories assigned yet.</p>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search existing categories..."
          className="pl-9"
        />
      </div>

      {available.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
          {available.map((cat) => (
            <label
              key={cat}
              className="flex cursor-pointer items-center gap-3 px-3 py-2.5 active:bg-secondary/50"
            >
              <Checkbox
                checked={false}
                onChange={() => toggleCategory(cat)}
              />
              <span className="text-sm">{cat}</span>
            </label>
          ))}
        </div>
      )}

      {search.trim() &&
        !allCategories.some(
          (c) => c.toLowerCase() === search.trim().toLowerCase(),
        ) &&
        !selectedNormalized.some(
          (c) => c.toLowerCase() === search.trim().toLowerCase(),
        ) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              const tag = search.trim()
              registerCategory(tag)
              onChange(normalizeCategoryList([...selectedNormalized, tag]))
              setSearch('')
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add &quot;{search.trim()}&quot; as new category
          </Button>
        )}

      <div className="flex gap-2">
        <Input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addNewCategory()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={addNewCategory}
        >
          Add
        </Button>
      </div>
    </div>
  )
}