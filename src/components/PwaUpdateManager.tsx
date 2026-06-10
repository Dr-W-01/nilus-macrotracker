import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { registerPwaUpdateHandler, showUpdateAvailableToast } from '@/lib/pwaUpdate'

const UPDATE_CHECK_MS = 60 * 60 * 1000

export function PwaUpdateManager() {
  const updateToastId = useRef<string | number | undefined>(undefined)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      const check = () => {
        void registration.update()
      }

      check()
      window.setInterval(check, UPDATE_CHECK_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error)
    },
  })

  useEffect(() => {
    registerPwaUpdateHandler(updateServiceWorker)
  }, [updateServiceWorker])

  useEffect(() => {
    if (!needRefresh) return
    if (updateToastId.current != null) return

    showUpdateAvailableToast(() => {
      updateToastId.current = undefined
      void updateServiceWorker(true)
    })
  }, [needRefresh, updateServiceWorker])

  return null
}