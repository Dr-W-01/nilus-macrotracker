import { useSyncExternalStore } from 'react'
import {
  formatLastUpdated,
  getLastUpdatedAt,
  getUpdateAvailable,
  subscribeAppUpdateState,
} from '@/lib/pwaUpdate'

export function useAppUpdateState() {
  const updateAvailable = useSyncExternalStore(
    subscribeAppUpdateState,
    getUpdateAvailable,
    () => false,
  )

  const lastUpdatedAt = getLastUpdatedAt()
  const lastUpdatedLabel = lastUpdatedAt
    ? formatLastUpdated(lastUpdatedAt)
    : null

  return { updateAvailable, lastUpdatedLabel }
}