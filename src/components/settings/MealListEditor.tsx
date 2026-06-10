import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { GripVertical, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEFAULT_MEALS } from '@/lib/meals'
import { mobilePlainTextInputProps } from '@/lib/mobileInput'
import { cn } from '@/lib/utils'
import { useMacroStore } from '@/store/useMacroStore'

export function MealListEditor() {
  const meals = useMacroStore((s) => s.settings.meals)
  const addMeal = useMacroStore((s) => s.addMeal)
  const renameMeal = useMacroStore((s) => s.renameMeal)
  const removeMeal = useMacroStore((s) => s.removeMeal)
  const reorderMeals = useMacroStore((s) => s.reorderMeals)
  const restoreDefaultMeals = useMacroStore((s) => s.restoreDefaultMeals)

  const [newMeal, setNewMeal] = useState('')
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const dragIndexRef = useRef<number | null>(null)
  const overIndexRef = useRef<number | null>(null)

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

  const resetDrag = () => {
    dragIndexRef.current = null
    overIndexRef.current = null
    setDragIndex(null)
    setOverIndex(null)
  }

  const finishDrag = () => {
    const from = dragIndexRef.current
    const to = overIndexRef.current
    if (from != null && to != null && from !== to) {
      reorderMeals(from, to)
    }
    resetDrag()
  }

  const resolveOverIndex = (clientY: number, fallback: number) => {
    if (!listRef.current) return fallback
    const rows = [...listRef.current.querySelectorAll<HTMLElement>('[data-meal-row]')]
    let nextOver = fallback
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      if (clientY >= mid) nextOver = i
    }
    return nextOver
  }

  const handleGripPointerDown = (index: number, e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragIndexRef.current = index
    overIndexRef.current = index
    setDragIndex(index)
    setOverIndex(index)

    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    const onMove = (ev: globalThis.PointerEvent) => {
      ev.preventDefault()
      const nextOver = resolveOverIndex(ev.clientY, index)
      overIndexRef.current = nextOver
      setOverIndex(nextOver)
    }

    const onUp = (ev: globalThis.PointerEvent) => {
      if (target.hasPointerCapture(ev.pointerId)) {
        target.releasePointerCapture(ev.pointerId)
      }
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onUp)
      finishDrag()
    }

    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onUp)
  }

  const displayMeals = (() => {
    if (dragIndex == null || overIndex == null || dragIndex === overIndex) return meals
    const next = [...meals]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(overIndex, 0, moved)
    return next
  })()

  return (
    <div className="space-y-2.5">
      <p className="text-xs text-muted-foreground">
        Drag the handle to reorder. Rename or add meals used on the Daily tab.
      </p>

      <ul ref={listRef} className="space-y-1 touch-none">
        {displayMeals.map((meal) => {
          const sourceIndex = meals.indexOf(meal)
          const isDragging = dragIndex === sourceIndex
          const isDropTarget =
            overIndex === sourceIndex &&
            dragIndex != null &&
            dragIndex !== sourceIndex

          return (
            <li
              key={meal}
              data-meal-row
              className={cn(
                'flex items-center gap-1 rounded-md border border-border bg-card px-1 py-0.5 transition-all duration-150',
                isDragging && 'scale-[0.98] opacity-70 shadow-sm',
                isDropTarget && 'border-primary bg-primary/10',
              )}
            >
              <button
                type="button"
                className="flex h-8 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground active:cursor-grabbing active:text-foreground"
                aria-label={`Reorder ${meal}`}
                onPointerDown={(e) => handleGripPointerDown(sourceIndex, e)}
              >
                <GripVertical className="h-4 w-4" />
              </button>
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
                className="h-7 min-h-0 border-0 bg-transparent px-1 py-0 text-sm shadow-none focus-visible:ring-0"
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
          )
        })}
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

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs text-muted-foreground"
        onClick={() => {
          restoreDefaultMeals()
          toast.success('Restored default meals')
        }}
      >
        <RotateCcw className="h-3 w-3" />
        Restore defaults ({DEFAULT_MEALS.join(', ')})
      </Button>
    </div>
  )
}