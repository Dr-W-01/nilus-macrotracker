import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    className="toaster group"
    closeButton
    duration={4500}
    swipeDirections={['top', 'left', 'right']}
    toastOptions={{
      classNames: {
        toast: 'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border',
        description: 'group-[.toast]:text-muted-foreground',
        actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
        cancelButton: 'group-[.toast]:bg-muted',
        closeButton:
          'group-[.toast]:bg-background/80 group-[.toast]:border-border group-[.toast]:text-foreground',
      },
    }}
    {...props}
  />
)

export { Toaster }