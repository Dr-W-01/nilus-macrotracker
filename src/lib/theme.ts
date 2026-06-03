import type { Settings } from './types'

export const DEFAULT_ACCENT_COLOR = '#B22222'
export const DEFAULT_SECONDARY_TEXT_COLOR = '#d1d1d1'

export function normalizeHexColor(value: string, fallback: string): string {
  const trimmed = value.trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed}`
  return fallback
}

/** Apply theme + custom colors to document CSS variables (instant global update). */
export function applyThemeColors(settings: Settings): void {
  const root = document.documentElement
  root.classList.toggle('light', settings.theme === 'light')

  const accent = normalizeHexColor(
    settings.accentColor,
    DEFAULT_ACCENT_COLOR,
  )
  const secondaryText = normalizeHexColor(
    settings.secondaryTextColor ?? DEFAULT_SECONDARY_TEXT_COLOR,
    DEFAULT_SECONDARY_TEXT_COLOR,
  )

  root.style.setProperty('--primary', accent)
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--ring', accent)
  root.style.setProperty('--muted-foreground', secondaryText)
  root.style.setProperty('--daily-muted', secondaryText)
}

export function withDefaultSettings(settings: Partial<Settings> & Settings): Settings {
  return {
    ...settings,
    accentColor: settings.accentColor || DEFAULT_ACCENT_COLOR,
    secondaryTextColor:
      settings.secondaryTextColor ?? DEFAULT_SECONDARY_TEXT_COLOR,
  }
}