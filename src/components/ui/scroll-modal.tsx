import { useEffect, type HTMLAttributes, type ReactNode } from 'react'
import { MODAL_HEADER_SURFACE, MODAL_SURFACE } from '@/lib/surfaceStyles'
import { cn } from '@/lib/utils'

/** Syncs --modal-vh to visual viewport height (keyboard open on mobile). */
export function useModalViewportHeight(active: boolean) {
  useEffect(() => {
    if (!active) return
    const vv = window.visualViewport
    const apply = () => {
      const h = vv?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--modal-vh', `${h}px`)
    }
    apply()
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    return () => {
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      document.documentElement.style.removeProperty('--modal-vh')
    }
  }, [active])
}

export function ModalViewport({ active }: { active: boolean }) {
  useModalViewportHeight(active)
  return null
}

/** Bottom sheet: fixed header, scrollable body, sticky footer */
export const scrollSheetContentClass = cn(
  'flex max-h-[min(92dvh,var(--modal-vh,92dvh))] flex-col gap-0 overflow-hidden p-0',
  MODAL_SURFACE,
)

export const scrollSheetHeaderClass = cn(
  'shrink-0 px-4 py-3 pr-12 text-left',
  MODAL_HEADER_SURFACE,
)

export const scrollSheetBodyClass =
  'min-h-0 flex-1 overflow-y-auto overscroll-contain bg-card px-4 py-4 [-webkit-overflow-scrolling:touch]'

/** Compact sticky footer: ~44px buttons, reduced padding (applies to all child buttons). */
export const scrollModalFooterButtonClass =
  '[&_button]:!h-11 [&_button]:!min-h-11 [&_button]:!max-h-11 [&_button]:!py-2 [&_button]:!px-4 [&_button]:!text-sm'

export const scrollSheetFooterClass = cn(
  'shrink-0 space-y-1.5 border-t border-border bg-card px-4 pt-2.5',
  'pb-[max(0.5rem,var(--safe-bottom))]',
  scrollModalFooterButtonClass,
)

export function ScrollSheetHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(scrollSheetHeaderClass, className)} {...props} />
}

export function ScrollSheetBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(scrollSheetBodyClass, className)} {...props} />
}

export function ScrollSheetFooter({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn(scrollSheetFooterClass, className)}>{children}</div>
  )
}

/** Centered dialog: scrollable body + sticky footer (keyboard-friendly top anchor) */
export const scrollDialogContentClass = cn(
  'fixed left-1/2 top-[max(0.5rem,env(safe-area-inset-top))] z-50 flex h-[min(92dvh,var(--modal-vh,92dvh))]',
  'w-[calc(100%-1rem)] max-w-lg -translate-x-1/2 translate-y-0 flex-col gap-0 overflow-hidden p-0',
  'max-h-[min(92dvh,var(--modal-vh,92dvh))] rounded-xl shadow-lg',
  MODAL_SURFACE,
  'sm:top-[5dvh] sm:h-[min(90dvh,var(--modal-vh,90dvh))] sm:max-h-[min(90dvh,var(--modal-vh,90dvh))]',
)

export const scrollDialogHeaderClass = cn(
  'shrink-0 space-y-1.5 px-4 pt-4 pr-12 text-left sm:px-6 sm:pt-6',
  MODAL_HEADER_SURFACE,
)

export const scrollDialogBodyClass =
  'min-h-0 flex-1 overflow-y-auto overscroll-contain bg-card px-4 py-4 [-webkit-overflow-scrolling:touch] sm:px-6'

export const scrollDialogFooterClass = cn(
  'shrink-0 space-y-1.5 border-t border-border bg-card px-4 pt-2.5 sm:px-6',
  'pb-[max(0.5rem,var(--safe-bottom))]',
  scrollModalFooterButtonClass,
)

export function ScrollDialogHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(scrollDialogHeaderClass, className)} {...props} />
}

export function ScrollDialogBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(scrollDialogBodyClass, className)} {...props} />
}

export function ScrollDialogFooter({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn(scrollDialogFooterClass, className)}>{children}</div>
  )
}