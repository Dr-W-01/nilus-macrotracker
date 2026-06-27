import { useEffect } from 'react'
import { registerAppOverlay } from '@/lib/appBackNavigation'

/** Registers a hardware-back / popstate handler while `active` is true. */
export function useAppBackHandler(onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    return registerAppOverlay(onClose)
  }, [active, onClose])
}