import { useEffect, useRef } from 'react'
import { useMacroStore } from '@/store/useMacroStore'

/** Runs retroactive badge scan on first launch; re-scans silently on later loads for new badges. */
export function BadgeUnlockListener() {
  const hasHydrated = useMacroStore((s) => s._hasHydrated)
  const initialized = useMacroStore((s) => s.badgeState.initialized)
  const initializeBadges = useMacroStore((s) => s.initializeBadges)
  const evaluateBadges = useMacroStore((s) => s.evaluateBadges)
  const didInit = useRef(false)

  useEffect(() => {
    if (!hasHydrated || didInit.current) return
    didInit.current = true
    if (!initialized) {
      initializeBadges()
    } else {
      evaluateBadges(true)
    }
  }, [hasHydrated, initialized, initializeBadges, evaluateBadges])

  return null
}