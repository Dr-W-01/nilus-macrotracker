import type { ReactNode } from 'react'
import { SURFACE_GRADIENT_ROUNDED } from '@/lib/surfaceStyles'
import { cn } from '@/lib/utils'

export const FORM_SECTION_CLASS = cn(SURFACE_GRADIENT_ROUNDED, 'p-4 space-y-3')

interface FormSectionProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  /** `card` = bordered gradient panel; `flat` = title + content only */
  variant?: 'card' | 'flat'
}

export function FormSection({
  title,
  description,
  children,
  className,
  variant = 'card',
}: FormSectionProps) {
  return (
    <section
      className={cn(
        variant === 'card' ? FORM_SECTION_CLASS : 'space-y-2.5',
        className,
      )}
    >
      {title && (
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}