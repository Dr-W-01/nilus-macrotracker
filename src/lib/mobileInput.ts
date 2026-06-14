/** Props that reduce iOS/Android autofill and keyboard accessory UI where possible. */
export const mobileFriendlyInputProps = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
  enterKeyHint: 'done' as const,
  autoSave: 'off',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
  'data-autofill': 'off',
  'aria-autocomplete': 'none' as const,
} as const

/** Decimal/numeric fields — lean keyboard without autofill accessory UI. */
export const mobileDecimalInputProps = {
  ...mobileFriendlyInputProps,
  inputMode: 'decimal' as const,
  pattern: '[0-9]*',
  name: 'numeric-field',
} as const

/** Lean props for short label/name fields (e.g. meal names in Settings). */
export const mobilePlainTextInputProps = {
  ...mobileFriendlyInputProps,
  type: 'text' as const,
  inputMode: 'text' as const,
  autoCapitalize: 'words' as const,
  name: 'plain-text-field',
} as const

export const mobileSearchInputProps = {
  ...mobileFriendlyInputProps,
  type: 'search' as const,
  inputMode: 'search' as const,
  enterKeyHint: 'search' as const,
  name: 'library-filter',
  id: 'library-filter-input',
} as const

const SKIP_MOBILE_DEFAULTS = new Set([
  'password',
  'hidden',
  'checkbox',
  'radio',
  'file',
  'submit',
  'button',
  'range',
  'color',
])

export function shouldApplyMobileInputDefaults(type?: string): boolean {
  if (!type || type === 'text' || type === 'search' || type === 'number') return true
  return !SKIP_MOBILE_DEFAULTS.has(type)
}