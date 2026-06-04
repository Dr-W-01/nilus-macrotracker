import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  ModalViewport,
  ScrollDialogBody,
  ScrollDialogFooter,
  ScrollDialogHeader,
  scrollDialogContentClass,
} from '@/components/ui/scroll-modal'
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
      <ModalViewport active={open} />
      <DialogContent
        className={scrollDialogContentClass}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollDialogHeader>
          <DialogTitle>Add category</DialogTitle>
        </ScrollDialogHeader>
        <ScrollDialogBody className="py-2">
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
        </ScrollDialogBody>
        <ScrollDialogFooter>
          <Button size="lg" className="w-full" onClick={handleCreate}>
            Create category
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </ScrollDialogFooter>
      </DialogContent>
    </Dialog>
  )
}