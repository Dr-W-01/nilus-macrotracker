import * as React from 'react'
import {
  mobileDecimalInputProps,
  mobileFriendlyInputProps,
  shouldApplyMobileInputDefaults,
} from '@/lib/mobileInput'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    const useMobile = shouldApplyMobileInputDefaults(type)
    const mobileProps =
      type === 'number' ? mobileDecimalInputProps : mobileFriendlyInputProps

    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...(useMobile ? mobileProps : {})}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }