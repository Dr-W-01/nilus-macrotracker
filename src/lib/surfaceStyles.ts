import { cn } from '@/lib/utils'

/** Subtle gradient surface for major cards, panels, and modal chrome. */
export const SURFACE_GRADIENT =
  'border-primary/20 bg-gradient-to-b from-primary/8 to-card' as const

export const SURFACE_GRADIENT_ROUNDED = cn(
  'rounded-xl border shadow-sm',
  SURFACE_GRADIENT,
)

export const SURFACE_GRADIENT_COMPACT = cn('rounded-lg border', SURFACE_GRADIENT)

/** Nested blocks inside gradient surfaces (fields, metrics, list rows). */
export const SURFACE_INNER =
  'rounded-lg border border-border/60 bg-secondary/30' as const