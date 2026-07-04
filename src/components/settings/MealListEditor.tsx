import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditIconButton } from '@/components/ui/edit-icon-button'
import { Input } from '@/components/ui/input'
import { mobilePlainTextInputProps } from '@/lib/mobileInput'

const reorderBtnClass = 'h-6 w-6 shrink-0'
const actionBtnClass = 'h-6 w-6 shrink-0'
const reorderIconClass = 'h-3.5 w-3.5'

export interface MealListEditorProps {
  meals: string[]
  onMealsChange: (meals: string[]) => void
}

export function MealListEditor({ meals, onMealsChange }: MealListEditorProps) {
  const [newMeal, setNewMeal] = useState('')
  const [editingMeal, setEditingMeal] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    const name = newMeal.trim()
    if (!name) return
    if (meals.some((m) => m.toLowerCase() === name.toLowerCase())) return
    onMealsChange([...meals, name])
    setNewMeal('')
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
    if (meals.some((m) => m.toLowerCase() === next.toLowerCase())) return
    onMealsChange(
      meals.map((m) => (m.toLowerCase() === original.toLowerCase() ? next : m)),
    )
  }

  const moveMeal = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= meals.length) return
    const next = [...meals]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    onMealsChange(next)
  }

  const removeMeal = (meal: string) => {
    if (meals.length <= 1) return
    onMealsChange(meals.filter((m) => m.toLowerCase() !== meal.toLowerCase()))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Reorder meal categories for this profile. Past logged days keep the meal list they were
        assigned — changes here only affect new days using this profile.
      </p>

      <ul className="space-y-1">
        {meals.map((meal, index) => {
          const isEditing = editingMeal === meal

          return (
            <li
              key={meal}
              className="flex items-center gap-0.5 border-b border-border/50 py-1"
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
                  className="h-8 min-h-0 flex-1 border-0 bg-transparent px-1 py-0 text-sm shadow-none focus-visible:ring-1"
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
                variant="ghost"
                size="icon"
                className={reorderBtnClass}
                disabled={index === 0}
                aria-label={`Move ${meal} up`}
                onClick={() => moveMeal(index, 'up')}
              >
                <ChevronUp className={reorderIconClass} strokeWidth={2.5} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={reorderBtnClass}
                disabled={index === meals.length - 1}
                aria-label={`Move ${meal} down`}
                onClick={() => moveMeal(index, 'down')}
              >
                <ChevronDown className={reorderIconClass} strokeWidth={2.5} />
              </Button>
              <EditIconButton
                className={actionBtnClass}
                iconClassName="h-3.5 w-3.5"
                label={`Edit ${meal}`}
                onClick={() => startEditing(meal)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`${actionBtnClass} text-muted-foreground hover:text-destructive`}
                disabled={meals.length <= 1}
                aria-label={`Delete ${meal}`}
                onClick={() => removeMeal(meal)}
              >
                <Trash2 className="h-3.5 w-3.5" />
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
          className="h-8 text-sm"
          {...mobilePlainTextInputProps}
        />
        <Button type="button" variant="outline" size="sm" className="h-7 min-h-7 shrink-0 gap-1 px-2.5 text-xs" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  )
}