import * as React from 'react'
import { cn } from '@/lib/utils'

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'>
>(({ className, ...props }, ref) => (
  <input
    type="checkbox"
    ref={ref}
    className={cn(
      'h-5 w-5 shrink-0 rounded border-2 border-interactive-border bg-interactive-surface accent-[var(--primary)] checked:border-primary',
      className,
    )}
    {...props}
  />
))
Checkbox.displayName = 'Checkbox'

export { Checkbox }