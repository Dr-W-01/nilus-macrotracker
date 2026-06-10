import { useState } from 'react'
import { GripVertical, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEFAULT_MEALS } from '@/lib/meals'
import { useMacroStore } from '@/store/useMacroStore'

export function MealListEditor() {
  const meals = useMacroStore((s) => s.settings.meals)
  const addMeal = useMacroStore((s) => s.addMeal)
  const renameMeal = useMacroStore((s) => s.renameMeal)
  const removeMeal = useMacroStore((s) => s.removeMeal)
  const restoreDefaultMeals = useMacroStore((s) => s.restoreDefaultMeals)

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

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Rename default meals or add your own. Meals appear on the Daily tab and when logging food.
      </p>

      <ul className="space-y-2">
        {meals.map((meal) => (
          <li
            key={meal}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
          >
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
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
              className="h-9 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
              aria-label={`Meal name: ${meal}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              disabled={meals.length <= 1}
              onClick={() => {
                if (meals.length <= 1) return
                removeMeal(meal)
                toast.success(`Removed "${meal}"`)
              }}
              aria-label={`Remove ${meal}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          value={newMeal}
          onChange={(e) => setNewMeal(e.target.value)}
          placeholder="New meal name…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          className="h-10"
        />
        <Button type="button" variant="outline" className="shrink-0 gap-1.5" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        onClick={() => {
          restoreDefaultMeals()
          toast.success('Restored default meals')
        }}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Restore defaults ({DEFAULT_MEALS.join(', ')})
      </Button>
    </div>
  )
}