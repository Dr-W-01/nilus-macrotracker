import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  ModalViewport,
  ScrollDialogBody,
  ScrollDialogFooter,
  ScrollDialogHeader,
  scrollDialogContentClass,
} from '@/components/ui/scroll-modal'

interface FactoryResetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function FactoryResetDialog({
  open,
  onOpenChange,
  onConfirm,
}: FactoryResetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalViewport active={open} onRequestClose={() => onOpenChange(false)} />
      <DialogContent className={scrollDialogContentClass}>
        <ScrollDialogHeader>
          <DialogTitle>Factory reset?</DialogTitle>
        </ScrollDialogHeader>
        <ScrollDialogBody className="space-y-3 py-2">
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <div className="space-y-2 text-sm leading-relaxed">
              <p className="text-foreground">
                This permanently erases everything stored on this device:
              </p>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                <li>Daily food logs and weight history</li>
                <li>Your food library and recipes</li>
                <li>Goal templates and app settings</li>
              </ul>
              <p className="font-medium text-destructive">
                This cannot be undone.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Export a backup from Settings → Data first if you want to keep your data.
            After a reset, the app returns to its default state.
          </p>
        </ScrollDialogBody>
        <ScrollDialogFooter>
          <Button
            size="lg"
            variant="destructive"
            className="w-full"
            onClick={onConfirm}
          >
            Erase all data
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </ScrollDialogFooter>
      </DialogContent>
    </Dialog>
  )
}