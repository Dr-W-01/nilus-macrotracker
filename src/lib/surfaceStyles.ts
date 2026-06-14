import { cn } from '@/lib/utils'

/**
 * Opaque gradient tint (never uses transparent color stops).
 * Mixes primary into card so content behind cannot show through.
 */
export const SURFACE_GRADIENT_FROM =
  'from-[color-mix(in_oklab,var(--primary)_8%,var(--card))]' as const

/** Subtle opaque gradient for in-page cards and panels. */
export const SURFACE_GRADIENT = cn(
  'border-primary/20 bg-gradient-to-b to-card',
  SURFACE_GRADIENT_FROM,
)

export const SURFACE_GRADIENT_ROUNDED = cn(
  'rounded-xl border shadow-sm',
  SURFACE_GRADIENT,
)

export const SURFACE_GRADIENT_COMPACT = cn('rounded-lg border', SURFACE_GRADIENT)

/** Solid opaque shell for all modal sheets and dialogs. */
export const MODAL_SURFACE = 'border-primary/20 bg-card' as const

/** Opaque header accent inside modals (subtle gradient, fully readable). */
export const MODAL_HEADER_SURFACE = cn(
  'border-b border-primary/20 bg-gradient-to-b to-card',
  SURFACE_GRADIENT_FROM,
)

/** Nested blocks inside gradient surfaces (fields, metrics, list rows). */
export const SURFACE_INNER =
  'rounded-lg border border-border/60 bg-secondary/30' as const