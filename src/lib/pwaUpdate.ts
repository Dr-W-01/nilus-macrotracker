import { toast } from 'sonner'

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

export type AppUpdateStatus = 'update-ready' | 'up-to-date' | 'unsupported'

let updateServiceWorker: UpdateServiceWorker | null = null

const PROBE_TIMEOUT_MS = 8000

export function registerPwaUpdateHandler(handler: UpdateServiceWorker) {
  updateServiceWorker = handler
}

export function showUpdateAvailableToast(onRefresh: () => void) {
  toast('Update available', {
    description: 'A new version of NullTracker is ready. Refresh to load it.',
    duration: Infinity,
    action: {
      label: 'Refresh',
      onClick: () => {
        void onRefresh()
      },
    },
  })
}

function waitForWaitingWorker(
  registration: ServiceWorkerRegistration,
  timeoutMs: number,
): Promise<boolean> {
  if (registration.waiting) return Promise.resolve(true)

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(!!registration.waiting), timeoutMs)

    const cleanup = () => {
      window.clearTimeout(timer)
      registration.removeEventListener('updatefound', onUpdateFound)
    }

    const onUpdateFound = () => {
      const worker = registration.installing
      if (!worker) {
        cleanup()
        resolve(!!registration.waiting)
        return
      }

      const onStateChange = () => {
        if (worker.state === 'installed') {
          worker.removeEventListener('statechange', onStateChange)
          cleanup()
          resolve(!!registration.waiting)
        }
      }

      worker.addEventListener('statechange', onStateChange)
      if (worker.state === 'installed') {
        worker.removeEventListener('statechange', onStateChange)
        cleanup()
        resolve(!!registration.waiting)
      }
    }

    registration.addEventListener('updatefound', onUpdateFound)
  })
}

/** Check the server for a newer service worker without reloading. */
export async function probeForAppUpdate(): Promise<AppUpdateStatus> {
  if (!('serviceWorker' in navigator)) return 'unsupported'

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return 'unsupported'

  if (registration.waiting) return 'update-ready'

  const waitPromise = waitForWaitingWorker(registration, PROBE_TIMEOUT_MS)

  try {
    await registration.update()
  } catch {
    return 'unsupported'
  }

  const found = await waitPromise
  if (found || registration.waiting) return 'update-ready'

  return 'up-to-date'
}

function waitForControllerChange(timeoutMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker.controller) {
      resolve()
      return
    }

    const timer = window.setTimeout(resolve, timeoutMs)
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        window.clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

export async function applyAppUpdate(): Promise<void> {
  if (updateServiceWorker) {
    await updateServiceWorker(true)
    return
  }

  const registration = await navigator.serviceWorker.getRegistration()
  if (registration?.waiting) {
    const activated = waitForControllerChange()
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    await activated
  }

  window.location.reload()
}

/** Used by pull-to-refresh: check for updates and apply when available. */
export async function runPullToRefreshUpdate(): Promise<void> {
  const status = await probeForAppUpdate()

  if (status === 'update-ready') {
    toast.loading('Update found — reloading…')
    await applyAppUpdate()
    return
  }

  if (status === 'up-to-date') {
    toast.success('You have the latest version')
    return
  }

  window.location.reload()
}

/** Used by Settings "Check for updates" button — auto-applies and reloads. */
export async function runManualUpdateCheck(): Promise<void> {
  const toastId = toast.loading('Checking for updates…')

  try {
    const status = await probeForAppUpdate()

    if (status === 'update-ready') {
      toast.loading('Update found — reloading…', { id: toastId })
      await applyAppUpdate()
      return
    }

    toast.dismiss(toastId)

    if (status === 'up-to-date') {
      toast.success('You\'re up to date')
      return
    }

    toast.message('Reloading to check for updates…')
    window.location.reload()
  } catch {
    toast.dismiss(toastId)
    toast.error('Could not check for updates. Try again in a moment.')
  }
}