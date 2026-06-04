import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  formatSignedNumberForInput,
  isSignedDecimalDraft,
  parseSignedDecimalInput,
  sanitizeSignedDecimalInput,
} from '@/lib/signedNumberInput'
import { cn } from '@/lib/utils'

interface SignedDecimalInputProps {
  value?: number
  onChange: (value: number | undefined) => void
  placeholder?: string
  className?: string
  id?: string
}

/**
 * Signed decimal text field for mobile-friendly negative entry.
 * Uses type="text" (not number) so minus can be typed; includes a − insert button
 * because many mobile decimal/numeric keyboards omit the minus key.
 */
export function SignedDecimalInput({
  value,
  onChange,
  placeholder,
  className,
  id,
}: SignedDecimalInputProps) {
  const [draft, setDraft] = useState(() => formatSignedNumberForInput(value))

  const applyDraft = (next: string) => {
    const sanitized = sanitizeSignedDecimalInput(next)
    if (!isSignedDecimalDraft(sanitized)) return
    setDraft(sanitized)
    onChange(parseSignedDecimalInput(sanitized))
  }

  const insertMinus = () => {
    const stripped = draft.replace(/^[+-]/, '')
    applyDraft(stripped ? `-${stripped}` : '-')
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        className="shrink-0 h-11 w-11 px-0 font-mono text-lg"
        aria-label="Insert minus sign for deficit"
        onClick={insertMinus}
      >
        −
      </Button>
      <Input
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        placeholder={placeholder}
        value={draft}
        onChange={(e) => applyDraft(e.target.value)}
        onBlur={() => {
          const parsed = parseSignedDecimalInput(draft)
          if (parsed == null && draft.trim() !== '') {
            const sanitized = sanitizeSignedDecimalInput(draft)
            setDraft(sanitized)
            onChange(parseSignedDecimalInput(sanitized))
          } else {
            setDraft(formatSignedNumberForInput(parsed))
          }
        }}
      />
    </div>
  )
}