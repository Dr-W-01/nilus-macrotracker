import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AppSelectOption = {
  value: string
  label: string
  description?: string
}

interface AppSelectProps {
  value: string
  options: AppSelectOption[]
  onChange: (value: string) => void
  /** Accessible name for the trigger button */
  'aria-label'?: string
  className?: string
  /** Compact trigger for dense rows (Daily meta rows) */
  compact?: boolean
  disabled?: boolean
}

/**
 * In-place dropdown selector matching app surface styles.
 * Replaces full-screen sheet pickers for simple single-choice lists.
 */
export function AppSelect({
  value,
  options,
  onChange,
  'aria-label': ariaLabel,
  className,
  compact = false,
  disabled = false,
}: AppSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (options.length === 0) return null

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <button
        type="button"
        disabled={disabled || options.length <= 1}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          'flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-card text-left text-foreground shadow-sm transition-colors',
          'hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-default disabled:opacity-80',
          compact ? 'h-8 px-2.5 py-1 text-sm' : 'h-10 px-3 py-2 text-sm',
          open && 'border-primary/40 ring-2 ring-ring/40',
        )}
        onClick={() => {
          if (disabled || options.length <= 1) return
          setOpen((v) => !v)
        }}
      >
        <span className="min-w-0 truncate font-semibold leading-tight">
          {selected?.label ?? '—'}
        </span>
        {options.length > 1 && (
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        )}
      </button>

      {open && options.length > 1 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            'absolute right-0 z-40 mt-1 max-h-56 min-w-full overflow-y-auto overscroll-contain',
            'rounded-lg border border-border bg-card py-1 shadow-lg',
            'w-max max-w-[min(20rem,calc(100vw-2rem))]',
          )}
        >
          {options.map((opt) => {
            const active = opt.value === value
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors',
                    active
                      ? 'bg-primary/10 text-foreground'
                      : 'text-foreground hover:bg-secondary/50 active:bg-secondary/60',
                  )}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0 text-primary',
                      !active && 'opacity-0',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-tight">{opt.label}</span>
                    {opt.description && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {opt.description}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
