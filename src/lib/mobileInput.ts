/** Props that reduce iOS/Android autofill and keyboard accessory UI where possible. */
export const mobileFriendlyInputProps = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
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
  if (!type || type === 'text' || type === 'search') return true
  return !SKIP_MOBILE_DEFAULTS.has(type)
}