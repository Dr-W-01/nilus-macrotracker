import { useRef, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Attributes that reduce autofill / keyboard accessory UI on mobile browsers. */
export const mobileSearchInputProps = {
  type: 'search' as const,
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
  inputMode: 'search' as const,
  enterKeyHint: 'search' as const,
  name: 'library-filter',
  id: 'library-filter-input',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
} as const

interface LibrarySearchInputProps
  extends Omit<ComponentProps<typeof Input>, 'type' | 'autoComplete'> {
  onSearchFocus?: () => void
  onSearchBlur?: () => void
}

export function LibrarySearchInput({
  className,
  onFocus,
  onBlur,
  onSearchFocus,
  onSearchBlur,
  ...props
}: LibrarySearchInputProps) {
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  return (
    <Input
      {...mobileSearchInputProps}
      className={cn('library-search-input', className)}
      onFocus={(e) => {
        if (blurTimer.current) {
          clearTimeout(blurTimer.current)
          blurTimer.current = undefined
        }
        onSearchFocus?.()
        onFocus?.(e)
      }}
      onBlur={(e) => {
        blurTimer.current = setTimeout(() => {
          onSearchBlur?.()
          onBlur?.(e)
        }, 200)
      }}
      {...props}
    />
  )
}