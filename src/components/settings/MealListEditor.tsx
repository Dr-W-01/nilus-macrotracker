import { useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DeleteMealDialog } from '@/components/settings/DeleteMealDialog'
import { Button } from '@/components/ui/button'
import { EditIconButton } from '@/components/ui/edit-icon-button'
import { Input } from '@/components/ui/input'
import { countLoggedFoodsForMeal } from '@/lib/meals'
import { mobilePlainTextInputProps } from '@/lib/mobileInput'
import { useMacroStore } from '@/store/useMacroStore'

const actionBtnClass = 'h-11 w-11 shrink-0'
const actionIconClass = 'h-5 w-5'

export function MealListEditor() {
  const meals = useMacroStore((s) => s.settings.meals)
  const dailyLogs = useMacroStore((s) => s.dailyLogs)
  const addMeal = useMacroStore((s) => s.addMeal)
  const renameMeal = useMacroStore((s) => s.renameMeal)
  const removeMeal = useMacroStore((s) => s.removeMeal)
  const reorderMeals = useMacroStore((s) => s.reorderMeals)

  const [newMeal, setNewMeal] = useState('')
  const [editingMeal, setEditingMeal] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [mealToDelete, setMealToDelete] = useState<string | null>(null)
  const editRef = useRef<HTMLInputElement>(null)

  const assignedFoodCount = useMemo(
    () => (mealToDelete ? countLoggedFoodsForMeal(dailyLogs, mealToDelete) : 0),
    [dailyLogs, mealToDelete],
  )

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

  const startEditing = (meal: string) => {
    setEditingMeal(meal)
    setEditValue(meal)
    requestAnimationFrame(() => editRef.current?.focus())
  }

  const cancelEditing = () => {
    setEditingMeal(null)
    setEditValue('')
  }

  const commitRename = (original: string) => {
    const next = editValue.trim()
    cancelEditing()
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

  const requestDelete = (meal: string) => {
    if (meals.length <= 1) return
    setMealToDelete(meal)
  }

  const confirmDelete = () => {
    if (!mealToDelete) return
    const meal = mealToDelete
    const ok = removeMeal(meal)
    setMealToDelete(null)
    if (ok) {
      toast.success(`Removed "${meal}" — logged foods moved to Uncategorized`)
    } else {
      toast.error('Could not delete meal. Your logged food data was not changed.')
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Reorder meals for the Daily tab. Deleting a meal moves its logged foods to Uncategorized
        — nothing is permanently removed.
      </p>

      <ul className="space-y-1.5">
        {meals.map((meal, index) => {
          const isEditing = editingMeal === meal

          return (
            <li
              key={meal}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5"
            >
              {isEditing ? (
                <Input
                  ref={editRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitRename(meal)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') cancelEditing()
                  }}
                  className="h-9 min-h-0 flex-1 border-0 bg-transparent px-1 py-0 text-sm shadow-none focus-visible:ring-1"
                  aria-label={`Edit meal name: ${meal}`}
                  {...mobilePlainTextInputProps}
                />
              ) : (
                <span className="min-w-0 flex-1 truncate px-0.5 text-sm font-medium">
                  {meal}
                </span>
              )}

              <Button
                type="button"
                variant="outline"
                size="icon"
                className={actionBtnClass}
                disabled={index === 0}
                aria-label={`Move ${meal} up`}
                onClick={() => moveMeal(index, 'up')}
              >
                <ChevronUp className={actionIconClass} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={actionBtnClass}
                disabled={index === meals.length - 1}
                aria-label={`Move ${meal} down`}
                onClick={() => moveMeal(index, 'down')}
              >
                <ChevronDown className={actionIconClass} />
              </Button>
              <EditIconButton
                variant="outline"
                className={actionBtnClass}
                iconClassName={actionIconClass}
                label={`Edit ${meal}`}
                onClick={() => startEditing(meal)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={`${actionBtnClass} text-muted-foreground hover:border-destructive/50 hover:text-destructive`}
                disabled={meals.length <= 1}
                aria-label={`Delete ${meal}`}
                onClick={() => requestDelete(meal)}
              >
                <Trash2 className={actionIconClass} />
              </Button>
            </li>
          )
        })}
      </ul>

      <div className="flex gap-2">
        <Input
          value={newMeal}
          onChange={(e) => setNewMeal(e.target.value)}
          placeholder="New meal…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          className="h-10 text-sm"
          {...mobilePlainTextInputProps}
        />
        <Button type="button" variant="outline" size="sm" className="h-10 shrink-0 gap-1.5 px-3" onClick={handleAdd}>
          <Plus className="h-5 w-5" />
          Add
        </Button>
      </div>

      <DeleteMealDialog
        open={mealToDelete !== null}
        meal={mealToDelete}
        assignedFoodCount={assignedFoodCount}
        onOpenChange={(open) => {
          if (!open) setMealToDelete(null)
        }}
        onConfirm={confirmDelete}
      />
    </div>
  )
}