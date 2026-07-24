import { useEffect, useState, type ReactNode } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  ModalViewport,
  ScrollDialogBody,
  ScrollDialogFooter,
  ScrollDialogHeader,
  fitScrollDialogContentClass,
} from '@/components/ui/scroll-modal'
import { SURFACE_INNER } from '@/lib/surfaceStyles'
import { cn } from '@/lib/utils'

export type AppSelectOption = {
  value: string
  label: string
  /** Plain secondary text (ignored when `detail` is provided) */
  description?: string
  /** Rich content under the label (macros, energy line, etc.) */
  detail?: ReactNode
}

interface AppSelectProps {
  value: string
  options: AppSelectOption[]
  onChange: (value: string) => void
  /** Dialog title when the picker opens */
  title?: string
  /** Accessible name for the trigger button */
  'aria-label'?: string
  className?: string
  /** Compact trigger for dense rows (Daily meta rows) */
  compact?: boolean
  disabled?: boolean
  /** Label for the confirm button (default Save) */
  saveLabel?: string
}

/**
 * Compact trigger that opens a modal of tappable option rows.
 * Selection is staged until the user taps Save (Cancel discards).
 */
export function AppSelect({
  value,
  options,
  onChange,
  title,
  'aria-label': ariaLabel,
  className,
  compact = false,
  disabled = false,
  saveLabel = 'Save',
}: AppSelectProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const selected = options.find((o) => o.value === value) ?? options[0]
  const dialogTitle = title ?? ariaLabel ?? 'Choose option'
  const canOpen = !disabled && options.length > 1
  const draftChanged = draft !== value

  useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  if (options.length === 0) return null

  const close = () => setOpen(false)

  const save = () => {
    if (draft !== value) onChange(draft)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        disabled={!canOpen}
        aria-label={ariaLabel ?? dialogTitle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-card text-left text-foreground shadow-sm transition-colors',
          'hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-default disabled:opacity-80',
          compact ? 'h-8 px-2.5 py-1 text-sm' : 'h-10 px-3 py-2 text-sm',
          open && 'border-primary/40 ring-2 ring-ring/40',
          className,
        )}
        onClick={() => {
          if (!canOpen) return
          setOpen(true)
        }}
      >
        <span className="min-w-0 truncate font-semibold leading-tight">
          {selected?.label ?? '—'}
        </span>
        {canOpen && (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <ModalViewport active={open} onRequestClose={close} />
        <DialogContent className={fitScrollDialogContentClass}>
          <ScrollDialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </ScrollDialogHeader>
          <ScrollDialogBody className="space-y-2 py-2">
            {options.map((opt) => {
              const active = opt.value === draft
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraft(opt.value)}
                  className={cn(
                    SURFACE_INNER,
                    'flex w-full items-start gap-3 px-3 py-3 text-left transition-colors',
                    'hover:bg-secondary/50 active:bg-secondary/60',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active && 'border-primary/40 bg-primary/10 ring-1 ring-primary/25',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-transparent',
                    )}
                    aria-hidden
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block text-sm font-semibold leading-tight text-foreground">
                      {opt.label}
                    </span>
                    {opt.detail ? (
                      <span className="block space-y-1">{opt.detail}</span>
                    ) : opt.description ? (
                      <span className="block text-xs leading-relaxed text-muted-foreground">
                        {opt.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </ScrollDialogBody>
          <ScrollDialogFooter>
            <Button size="lg" className="w-full" disabled={!draftChanged} onClick={save}>
              {saveLabel}
            </Button>
            <Button size="lg" variant="ghost" className="w-full" onClick={close}>
              Cancel
            </Button>
          </ScrollDialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
