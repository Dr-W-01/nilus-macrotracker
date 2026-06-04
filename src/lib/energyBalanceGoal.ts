export type EnergyBalanceMode = 'deficit' | 'surplus'

/** Split stored signed value into UI mode + positive magnitude. */
export function splitTargetDeficit(targetDeficit?: number): {
  mode: EnergyBalanceMode
  amount: string
} {
  if (targetDeficit == null || targetDeficit === 0) {
    return { mode: 'deficit', amount: '' }
  }
  if (targetDeficit < 0) {
    return { mode: 'deficit', amount: String(Math.abs(targetDeficit)) }
  }
  return { mode: 'surplus', amount: String(targetDeficit) }
}

/** Combine toggle + positive amount into signed storage (negative = deficit, positive = surplus). */
export function combineTargetDeficit(
  mode: EnergyBalanceMode,
  amountRaw: string,
): number | undefined {
  const trimmed = amountRaw.trim()
  if (trimmed === '') return undefined
  const n = parseFloat(trimmed)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return mode === 'deficit' ? -n : n
}