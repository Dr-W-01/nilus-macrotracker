import { useEffect, useRef } from 'react'
import { useMacroStore } from '@/store/useMacroStore'

/** Runs retroactive badge scan once after persistence hydrates. */
export function BadgeUnlockListener() {
  const hasHydrated = useMacroStore((s) => s._hasHydrated)
  const initialized = useMacroStore((s) => s.badgeState.initialized)
  const initializeBadges = useMacroStore((s) => s.initializeBadges)
  const didInit = useRef(false)

  useEffect(() => {
    if (!hasHydrated || initialized || didInit.current) return
    didInit.current = true
    initializeBadges()
  }, [hasHydrated, initialized, initializeBadges])

  return null
}