import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const FORM_SECTION_CLASS =
  'rounded-xl border border-primary/20 bg-gradient-to-b from-primary/8 to-card p-4 space-y-3'

interface FormSectionProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <section className={cn(FORM_SECTION_CLASS, className)}>
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