import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mobilePlainTextInputProps } from '@/lib/mobileInput'
import { useMacroStore } from '@/store/useMacroStore'

export function MealListEditor() {
  const meals = useMacroStore((s) => s.settings.meals)
  const addMeal = useMacroStore((s) => s.addMeal)
  const renameMeal = useMacroStore((s) => s.renameMeal)
  const removeMeal = useMacroStore((s) => s.removeMeal)
  const reorderMeals = useMacroStore((s) => s.reorderMeals)

  const [newMeal, setNewMeal] = useState('')
  const [editing, setEditing] = useState<Record<string, string>>({})

  const handleAdd = () => {
    const name = newMeal.trim()
    if (!name) return
    if (addMeal(name)) {
      setNewMeal('')
      toast.success(`Added meal "${name}"`)
    } else {
      toast.error('That meal already exists')
    }
  }

  const commitRename = (original: string) => {
    const next = (editing[original] ?? original).trim()
    setEditing((prev) => {
      const copy = { ...prev }
      delete copy[original]
      return copy
    })
    if (!next || next.toLowerCase() === original.toLowerCase()) return
    if (renameMeal(original, next)) {
      toast.success(`Renamed "${original}" to "${next}"`)
    } else {
      toast.error('Could not rename — name may already exist')
    }
  }

  const moveMeal = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= meals.length) return
    reorderMeals(index, target)
  }

  return (
    <div className="space-y-2.5">
      <p className="text-xs text-muted-foreground">
        Use the arrows to reorder. Rename or add meals used on the Daily tab.
      </p>

      <ul className="space-y-1">
        {meals.map((meal, index) => (
          <li
            key={meal}
            className="flex items-center gap-1 rounded-md border border-border bg-card px-1 py-0.5"
          >
            <div className="flex shrink-0 flex-col">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground"
                disabled={index === 0}
                aria-label={`Move ${meal} up`}
                onClick={() => moveMeal(index, 'up')}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground"
                disabled={index === meals.length - 1}
                aria-label={`Move ${meal} down`}
                onClick={() => moveMeal(index, 'down')}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input
              value={editing[meal] ?? meal}
              onChange={(e) =>
                setEditing((prev) => ({ ...prev, [meal]: e.target.value }))
              }
              onBlur={() => commitRename(meal)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              className="h-7 min-h-0 flex-1 border-0 bg-transparent px-1 py-0 text-sm shadow-none focus-visible:ring-0"
              aria-label={`Meal name: ${meal}`}
              {...mobilePlainTextInputProps}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              disabled={meals.length <= 1}
              onClick={() => {
                if (meals.length <= 1) return
                removeMeal(meal)
                toast.success(`Removed "${meal}"`)
              }}
              aria-label={`Remove ${meal}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex gap-1.5">
        <Input
          value={newMeal}
          onChange={(e) => setNewMeal(e.target.value)}
          placeholder="New meal…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          className="h-8 text-sm"
          {...mobilePlainTextInputProps}
        />
        <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1 px-2.5" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  )
}