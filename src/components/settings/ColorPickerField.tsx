import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ModalViewport,
  ScrollDialogBody,
  ScrollDialogFooter,
  ScrollDialogHeader,
  scrollDialogContentClass,
} from '@/components/ui/scroll-modal'
import { mobilePlainTextInputProps } from '@/lib/mobileInput'
import { SURFACE_GRADIENT_COMPACT } from '@/lib/surfaceStyles'
import { normalizeHexColor } from '@/lib/theme'
import { cn } from '@/lib/utils'

interface ColorPickerFieldProps {
  id: string
  label: string
  description?: string
  value: string
  fallback: string
  presets: string[]
  onChange: (color: string) => void
}

export function ColorPickerField({
  id,
  label,
  description,
  value,
  fallback,
  presets,
  onChange,
}: ColorPickerFieldProps) {
  const safe = normalizeHexColor(value, fallback)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(safe)

  const openPicker = () => {
    setDraft(safe)
    setOpen(true)
  }

  const applyColor = (color: string) => {
    const next = normalizeHexColor(color, fallback)
    onChange(next)
    setDraft(next)
  }

  const save = () => {
    applyColor(draft)
    setOpen(false)
  }

  return (
    <>
      <div className={cn(SURFACE_GRADIENT_COMPACT, 'p-2.5')}>
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
        <button
          type="button"
          id={id}
          className="mt-2 flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card/50 px-2.5 py-2 text-left transition-colors hover:bg-secondary/40"
          onClick={openPicker}
          aria-label={`Select ${label}`}
        >
          <span
            className="h-9 w-9 shrink-0 rounded-md border border-border shadow-sm"
            style={{ backgroundColor: safe }}
            aria-hidden
          />
          <span className="font-mono text-sm uppercase text-foreground">{safe}</span>
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <ModalViewport active={open} onRequestClose={() => setOpen(false)} />
        <DialogContent className={scrollDialogContentClass}>
          <ScrollDialogHeader>
            <DialogTitle>Select color</DialogTitle>
            <p className="text-xs text-muted-foreground">{label}</p>
          </ScrollDialogHeader>
          <ScrollDialogBody className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/20 p-3">
              <span
                className="h-14 w-14 shrink-0 rounded-lg border border-border shadow-sm"
                style={{ backgroundColor: normalizeHexColor(draft, fallback) }}
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Preview</p>
                <p className="font-mono text-sm uppercase">{normalizeHexColor(draft, fallback)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Suggested colors</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {presets.map((color) => {
                  const selected =
                    normalizeHexColor(draft, fallback).toUpperCase() === color.toUpperCase()
                  return (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      className={cn(
                        'h-9 w-9 shrink-0 rounded-lg border-2 transition-transform active:scale-95',
                        selected ? 'border-foreground ring-2 ring-primary/40' : 'border-border/60',
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setDraft(color)}
                    />
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${id}-hex`} className="text-xs text-muted-foreground">
                Custom hex
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={normalizeHexColor(draft, fallback)}
                  onChange={(e) => setDraft(e.target.value)}
                  className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                  aria-label={`${label} visual picker`}
                />
                <Input
                  id={`${id}-hex`}
                  {...mobilePlainTextInputProps}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="font-mono text-sm uppercase"
                  maxLength={7}
                  autoCapitalize="characters"
                />
              </div>
            </div>
          </ScrollDialogBody>
          <ScrollDialogFooter>
            <Button size="lg" className="w-full" onClick={save}>
              Apply color
            </Button>
            <Button size="lg" variant="ghost" className="w-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </ScrollDialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}