/** Allows empty, lone sign, or partial signed decimals while typing. */
export function isSignedDecimalDraft(raw: string): boolean {
  const t = raw.trim()
  if (t === '' || t === '+' || t === '-') return true
  return /^[+-]?(\d+\.?\d*|\.\d*)$/.test(t)
}

export function parseSignedDecimalInput(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '+' || trimmed === '-') return undefined
  const n = parseFloat(trimmed)
  return Number.isFinite(n) ? n : undefined
}

export function formatSignedNumberForInput(value?: number): string {
  if (value == null) return ''
  return String(value)
}

/** Keep only characters valid in a signed decimal field. */
export function sanitizeSignedDecimalInput(raw: string): string {
  let out = ''
  let hasSign = false
  let hasDot = false
  for (const ch of raw) {
    if ((ch === '+' || ch === '-') && !hasSign && out.length === 0) {
      out += ch
      hasSign = true
      continue
    }
    if (ch === '.' && !hasDot) {
      out += ch
      hasDot = true
      continue
    }
    if (ch >= '0' && ch <= '9') out += ch
  }
  return out
}