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

  const [picked, setPicked] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  const categories = useMemo(
    () => collectAllCategories(foodLibrary, customCategories).sort((a, b) => a.localeCompare(b)),
    [foodLibrary, customCategories],
  )

  useEffect(() => {
    if (open) {
      setPicked(null)
      setNewName('')
    }
  }, [open])

  const assignToCategory = (category: string) => {
    const tag = normalizeCategoryList([category])[0]
    if (!tag || selectedIds.length === 0) return
    addLibraryCategory(tag)
    applyCategoryMembership(tag, selectedIds, [])
    toast.success(
      `Added "${tag}" to ${selectedIds.length} ${selectedIds.length === 1 ? 'item' : 'items'}`,
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
    if (!addLibraryCategory(tag) && !categories.some((c) => c.toLowerCase() === tag.toLowerCase())) {
      toast.error('Could not create category')
      return
    }
    assignToCategory(tag)
  }

  const handleAssignExisting = () => {
    if (!picked) {
      toast.error('Choose a category')
      return
    }
    assignToCategory(picked)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign category</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Adds the category to {selectedIds.length} selected{' '}
          {selectedIds.length === 1 ? 'item' : 'items'} (existing categories are kept).
        </p>

        {categories.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Existing categories</Label>
            <ul className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {categories.map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    className={`w-full px-3 py-2.5 text-left text-sm active:bg-secondary/50 ${
                      picked === cat ? 'bg-primary/15 font-medium' : ''
                    }`}
                    onClick={() => setPicked(cat)}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
            <Button className="w-full" disabled={!picked} onClick={handleAssignExisting}>
              Assign to selected category
            </Button>
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs">Or create new category</Label>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreateAndAssign()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={handleCreateAndAssign}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="secondary" className="w-full" onClick={handleCreateAndAssign}>
            Create &amp; assign
          </Button>
        </div>

        <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  )
}