import type { Settings } from './types'

export const DEFAULT_ACCENT_COLOR = '#B22222'
export const DEFAULT_SECONDARY_TEXT_COLOR = '#d1d1d1'
export const DEFAULT_LIGHT_SECONDARY_TEXT_COLOR = '#000000'

/** Preset secondary colors tuned for dark backgrounds — poor contrast on light theme */
export const DARK_THEME_SECONDARY_PRESETS = new Set([
  '#D1D1D1',
  '#C4C4C4',
  '#E5E5E5',
  '#A3A3A3',
  '#9CA3AF',
  '#FFFFFF',
  '#F4F4F5',
  '#F4F4F4',
  DEFAULT_SECONDARY_TEXT_COLOR.toUpperCase(),
])

/** Colors that should reset to black when switching to light mode */
export function isDarkThemeSecondaryColor(color: string): boolean {
  const upper = normalizeHexColor(color, DEFAULT_SECONDARY_TEXT_COLOR).toUpperCase()
  return DARK_THEME_SECONDARY_PRESETS.has(upper)
}

export function normalizeHexColor(value: string, fallback: string): string {
  const trimmed = value.trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed}`
  return fallback
}

function resolveSecondaryTextColor(settings: Settings): string {
  const raw = normalizeHexColor(
    settings.secondaryTextColor ?? DEFAULT_SECONDARY_TEXT_COLOR,
    DEFAULT_SECONDARY_TEXT_COLOR,
  )
  if (settings.theme === 'light') {
    const upper = raw.toUpperCase()
    if (DARK_THEME_SECONDARY_PRESETS.has(upper) || upper === DEFAULT_SECONDARY_TEXT_COLOR.toUpperCase()) {
      return DEFAULT_LIGHT_SECONDARY_TEXT_COLOR
    }
  }
  return raw
}

/** Apply theme + custom colors to document CSS variables (instant global update). */
export function applyThemeColors(settings: Settings): void {
  const root = document.documentElement
  root.classList.toggle('light', settings.theme === 'light')

  const accent = normalizeHexColor(
    settings.accentColor,
    DEFAULT_ACCENT_COLOR,
  )
  const secondaryText = resolveSecondaryTextColor(settings)

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

export function secondaryPresetsForTheme(theme: 'dark' | 'light'): string[] {
  if (theme === 'light') {
    return ['#000000', '#171717', '#404040', '#52525B', '#6B7280']
  }
  return ['#A3A3A3', '#9CA3AF', '#8B8B8B', '#B0B0B0', '#7A7A7A']
}

/** Balanced rainbow accents — distinct hues with strong contrast in dark and light themes */
export function accentPresetsForTheme(): string[] {
  return ['#DC2626', '#F97316', '#22C55E', '#2563EB', '#7C3AED']
}