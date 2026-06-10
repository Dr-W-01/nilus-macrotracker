import { format } from 'date-fns'
import { toast } from 'sonner'

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

export type AppUpdateStatus = 'update-ready' | 'up-to-date' | 'unsupported'

const RELOAD_PARAM = '_app_reload'
const LAST_UPDATED_KEY = 'nulltracker:last-updated'

let updateAvailable = false
const updateListeners = new Set<() => void>()

/** iOS can be slow to download and install a waiting worker. */
const PROBE_TIMEOUT_MS = 10000

let updateServiceWorker: UpdateServiceWorker | null = null

export function registerPwaUpdateHandler(handler: UpdateServiceWorker) {
  updateServiceWorker = handler
}

export function setUpdateAvailable(available: boolean): void {
  if (updateAvailable === available) return
  updateAvailable = available
  updateListeners.forEach((listener) => listener())
}

export function getUpdateAvailable(): boolean {
  return updateAvailable
}

export function subscribeAppUpdateState(listener: () => void): () => void {
  updateListeners.add(listener)
  return () => {
    updateListeners.delete(listener)
  }
}

export function recordSuccessfulUpdate(): void {
  try {
    localStorage.setItem(LAST_UPDATED_KEY, new Date().toISOString())
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
}

export function getLastUpdatedAt(): Date | null {
  try {
    const raw = localStorage.getItem(LAST_UPDATED_KEY)
    if (!raw) return null
    const date = new Date(raw)
    return Number.isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

export function formatLastUpdated(date: Date): string {
  return format(date, 'MMM d, yyyy')
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

/** Remove the cache-bust query param left by performHardReload. */
export function clearReloadParam(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(RELOAD_PARAM)) return
  url.searchParams.delete(RELOAD_PARAM)
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
}

/**
 * Full navigation reload that bypasses bfcache and forces fresh HTML/CSS/JS
 * from the newly activated service worker.
 */
export function performHardReload(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete(RELOAD_PARAM)
  url.searchParams.set(RELOAD_PARAM, String(Date.now()))
  window.location.replace(url.toString())
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
  return !!registration.waiting && !!navigator.serviceWorker.controller
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
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

function waitForControllerChange(timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker.controller) {
      resolve(false)
      return
    }

    const timer = window.setTimeout(() => resolve(false), timeoutMs)

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        window.clearTimeout(timer)
        resolve(true)
      },
      { once: true },
    )
  })
}

async function requestSkipWaiting(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  const waiting = registration.waiting
  if (!waiting) return

  const controllerChange = waitForControllerChange()

  if (updateServiceWorker) {
    try {
      // vite-plugin-pwa only posts SKIP_WAITING; it does not reload the page.
      await updateServiceWorker(false)
    } catch {
      waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  } else {
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  // Do not block reload for the full timeout if the worker already took control.
  await Promise.race([
    controllerChange,
    new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
  ])
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

/**
 * Activate a waiting worker, then hard-reload so HTML/CSS/JS match the new cache.
 * Never relies on vite-plugin-pwa's implicit reload — that listener is often missing
 * when updates are detected via the native registration API.
 */
export async function applyAppUpdate(): Promise<void> {
  const registration = await getServiceWorkerRegistration()

  if (registration?.waiting) {
    await requestSkipWaiting(registration)
  }

  recordSuccessfulUpdate()
  setUpdateAvailable(false)
  performHardReload()
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
      toast.success("You're up to date")
      return
    }

    toast.message('Reloading to check for updates…')
    performHardReload()
  } catch {
    toast.dismiss(toastId)
    toast.error('Could not check for updates. Try again in a moment.')
  }
}