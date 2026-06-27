import { useEffect } from 'react'
import { initAppBackNavigation } from '@/lib/appBackNavigation'

/** Mount once at app root to enable in-app hardware back navigation. */
export function AppBackNavigation() {
  useEffect(() => initAppBackNavigation(), [])
  return null
}