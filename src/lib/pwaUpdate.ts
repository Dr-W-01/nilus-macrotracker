import { toast } from 'sonner'

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

export type AppUpdateStatus = 'update-ready' | 'up-to-date' | 'unsupported'

let updateServiceWorker: UpdateServiceWorker | null = null

/** iOS can be slow to download and install a waiting worker. */
const PROBE_TIMEOUT_MS = 10000

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

function serviceWorkerScriptUrl(): string {
  const base = import.meta.env.BASE_URL
  return new URL('sw.js', `${window.location.origin}${base}`).href
}

/** Bypass HTTP caches so iOS Safari fetches the latest sw.js byte string. */
async function bustServiceWorkerCache(): Promise<void> {
  try {
    await fetch(serviceWorkerScriptUrl(), {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Cache-Control': 'no-cache' },
    })
  } catch {
    // Network errors are handled by registration.update()
  }
}

function hasPendingUpdate(registration: ServiceWorkerRegistration): boolean {
  return (
    !!registration.waiting &&
    !!navigator.serviceWorker.controller
  )
}

function waitForWaitingWorker(
  registration: ServiceWorkerRegistration,
  timeoutMs: number,
): Promise<boolean> {
  if (hasPendingUpdate(registration)) return Promise.resolve(true)

  return new Promise((resolve) => {
    const timer = window.setTimeout(
      () => resolve(hasPendingUpdate(registration)),
      timeoutMs,
    )

    const cleanup = () => {
      window.clearTimeout(timer)
      registration.removeEventListener('updatefound', onUpdateFound)
    }

    const onUpdateFound = () => {
      const worker = registration.installing
      if (!worker) {
        cleanup()
        resolve(hasPendingUpdate(registration))
        return
      }

      const onStateChange = () => {
        if (worker.state !== 'installed') return
        worker.removeEventListener('statechange', onStateChange)
        cleanup()
        resolve(hasPendingUpdate(registration))
      }

      worker.addEventListener('statechange', onStateChange)
      if (worker.state === 'installed') {
        onStateChange()
      }
    }

    registration.addEventListener('updatefound', onUpdateFound)
  })
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null

  let registration = await navigator.serviceWorker.getRegistration()
  if (registration) return registration

  const base = import.meta.env.BASE_URL
  try {
    registration = await navigator.serviceWorker.register(`${base}sw.js`, {
      scope: base,
    })
    return registration
  } catch {
    return null
  }
}

/** Check the server for a newer service worker without reloading. */
export async function probeForAppUpdate(): Promise<AppUpdateStatus> {
  const registration = await getServiceWorkerRegistration()
  if (!registration) return 'unsupported'

  if (hasPendingUpdate(registration)) return 'update-ready'

  const waitPromise = waitForWaitingWorker(registration, PROBE_TIMEOUT_MS)

  await bustServiceWorkerCache()

  try {
    await registration.update()
  } catch {
    return 'unsupported'
  }

  const found = await waitPromise
  if (found || hasPendingUpdate(registration)) return 'update-ready'

  return 'up-to-date'
}

function waitForControllerChange(timeoutMs = 5000): Promise<void> {
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

function hardReload(): void {
  window.location.reload()
}

export async function applyAppUpdate(): Promise<void> {
  if (updateServiceWorker) {
    try {
      await updateServiceWorker(true)
      return
    } catch {
      // Fall through to manual activation below.
    }
  }

  const registration = await getServiceWorkerRegistration()
  const waiting = registration?.waiting

  if (waiting) {
    const activated = waitForControllerChange()
    waiting.postMessage({ type: 'SKIP_WAITING' })
    await activated
  }

  hardReload()
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
    hardReload()
  } catch {
    toast.dismiss(toastId)
    toast.error('Could not check for updates. Try again in a moment.')
  }
}