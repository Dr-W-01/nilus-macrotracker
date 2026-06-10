import { Pencil } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EditIconButtonProps extends Omit<ComponentProps<typeof Button>, 'children'> {
  label?: string
}

/** Consistent pencil edit action used across the app. */
export function EditIconButton({
  label = 'Edit',
  className,
  size = 'icon',
  variant = 'outline',
  ...props
}: EditIconButtonProps) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn('shrink-0', className)}
      aria-label={label}
      title={label}
      {...props}
    >
      <Pencil className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </Button>
  )
}