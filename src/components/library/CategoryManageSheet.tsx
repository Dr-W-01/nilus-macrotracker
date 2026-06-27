import { useEffect, useState } from 'react'
import { Pencil, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ModalViewport,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetHeader,
  scrollSheetContentClass,
} from '@/components/ui/scroll-modal'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { itemsInCategory } from '@/lib/categories'
import { useMacroStore } from '@/store/useMacroStore'

interface CategoryManageSheetProps {
  open: boolean
  category: string | null
  onOpenChange: (open: boolean) => void
  onRenamed?: (newName: string) => void
  onEditMembership: () => void
  onRequestDelete: () => void
}

export function CategoryManageSheet({
  open,
  category,
  onOpenChange,
  onRenamed,
  onEditMembership,
  onRequestDelete,
}: CategoryManageSheetProps) {
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const renameLibraryCategory = useMacroStore((s) => s.renameLibraryCategory)

  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)

  useEffect(() => {
    if (open && category) {
      setRenameValue(category)
      setRenaming(false)
    }
  }, [open, category])

  if (!category) return null

  const memberCount = itemsInCategory(foodLibrary, category).filter((f) => !f.isRecipe).length

  const handleRename = () => {
    const next = renameValue.trim()
    if (!next) {
      toast.error('Enter a category name')
      return
    }
    if (next.toLowerCase() === category.toLowerCase()) {
      setRenaming(false)
      return
    }
    const ok = renameLibraryCategory(category, next)
    if (!ok) {
      toast.error('That category name already exists')
      return
    }
    toast.success(`Renamed to "${next}"`)
    setRenaming(false)
    onRenamed?.(next)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ModalViewport active={open} onRequestClose={() => onOpenChange(false)} />
      <SheetContent side="bottom" className={scrollSheetContentClass}>
        <ScrollSheetHeader>
          <SheetTitle>{category}</SheetTitle>
          <p className="text-xs text-muted-foreground font-normal">
            {memberCount} {memberCount === 1 ? 'item' : 'items'}
          </p>
        </ScrollSheetHeader>

        <ScrollSheetBody className="space-y-2">
          {renaming ? (
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Category name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleRename()
                }
              }}
            />
          ) : (
            <>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setRenaming(true)}
              >
                <Pencil className="h-4 w-4" />
                Rename category
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onOpenChange(false)
                  onEditMembership()
                }}
              >
                <Users className="h-4 w-4" />
                Add or remove items
              </Button>
            </>
          )}
        </ScrollSheetBody>

        <ScrollSheetFooter>
          {renaming ? (
            <>
              <Button size="lg" className="w-full" onClick={handleRename}>
                Save name
              </Button>
              <Button size="lg" variant="ghost" className="w-full" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="lg"
                variant="outline"
                className="w-full justify-center gap-2 text-destructive border-destructive/40"
                onClick={() => {
                  onOpenChange(false)
                  onRequestDelete()
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete category…
              </Button>
              <Button size="lg" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </>
          )}
        </ScrollSheetFooter>
      </SheetContent>
    </Sheet>
  )
}