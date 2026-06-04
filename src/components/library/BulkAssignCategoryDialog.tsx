import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { collectAllCategories, normalizeCategoryList } from '@/lib/categories'
import { useMacroStore } from '@/store/useMacroStore'

interface BulkAssignCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
  onAssigned: () => void
}

export function BulkAssignCategoryDialog({
  open,
  onOpenChange,
  selectedIds,
  onAssigned,
}: BulkAssignCategoryDialogProps) {
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const customCategories = useMacroStore((s) => s.customCategories)
  const addLibraryCategory = useMacroStore((s) => s.addLibraryCategory)
  const applyCategoryMembership = useMacroStore((s) => s.applyCategoryMembership)

  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const categories = useMemo(
    () => collectAllCategories(foodLibrary, customCategories).sort((a, b) => a.localeCompare(b)),
    [foodLibrary, customCategories],
  )

  useEffect(() => {
    if (open) {
      setNewName('')
      setShowCreate(categories.length === 0)
    }
  }, [open, categories.length])

  const assignToCategory = (category: string) => {
    const tag = normalizeCategoryList([category])[0]
    if (!tag || selectedIds.length === 0) return
    addLibraryCategory(tag)
    applyCategoryMembership(tag, selectedIds, [])
    toast.success(
      `Tagged ${selectedIds.length} ${selectedIds.length === 1 ? 'item' : 'items'} with "${tag}"`,
    )
    onAssigned()
    onOpenChange(false)
  }

  const handleCreateAndAssign = () => {
    const tag = normalizeCategoryList([newName])[0]
    if (!tag) {
      toast.error('Enter a category name')
      return
    }
    if (
      !addLibraryCategory(tag) &&
      !categories.some((c) => c.toLowerCase() === tag.toLowerCase())
    ) {
      toast.error('Could not create category')
      return
    }
    assignToCategory(tag)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign category</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Tap a category to add it to {selectedIds.length} selected{' '}
          {selectedIds.length === 1 ? 'item' : 'items'}. Existing tags are kept.
        </p>

        {categories.length > 0 && (
          <ul className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {categories.map((cat) => (
              <li key={cat}>
                <button
                  type="button"
                  className="w-full px-3 py-3 text-left text-sm font-medium active:bg-primary/15 hover:bg-secondary/40"
                  onClick={() => assignToCategory(cat)}
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 pt-1">
          {!showCreate && categories.length > 0 ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New category
            </Button>
          ) : (
            <>
              <Label className="text-xs">New category</Label>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Category name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateAndAssign()
                    }
                  }}
                />
                <Button type="button" onClick={handleCreateAndAssign}>
                  Add
                </Button>
              </div>
            </>
          )}
        </div>

        <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  )
}