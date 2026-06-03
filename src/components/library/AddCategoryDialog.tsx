import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useMacroStore } from '@/store/useMacroStore'

interface AddCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (name: string) => void
}

export function AddCategoryDialog({
  open,
  onOpenChange,
  onCreated,
}: AddCategoryDialogProps) {
  const addLibraryCategory = useMacroStore((s) => s.addLibraryCategory)
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName('')
  }, [open])

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Enter a category name')
      return
    }
    const ok = addLibraryCategory(trimmed)
    if (!ok) {
      toast.error('That category already exists')
      return
    }
    toast.success(`Category "${trimmed}" created`)
    onCreated?.(trimmed)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add category</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Protein, Snacks..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleCreate()
            }
          }}
        />
        <Button className="w-full" onClick={handleCreate}>
          Create category
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  )
}