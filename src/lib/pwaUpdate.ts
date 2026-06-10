type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

let updateServiceWorker: UpdateServiceWorker | null = null

export function registerPwaUpdateHandler(handler: UpdateServiceWorker) {
  updateServiceWorker = handler
}

export async function checkForAppUpdate(
  reloadPage = true,
): Promise<'updated' | 'reloaded' | 'unchanged'> {
  if (!('serviceWorker' in navigator)) {
    if (reloadPage) window.location.reload()
    return reloadPage ? 'reloaded' : 'unchanged'
  }

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) {
    if (reloadPage) window.location.reload()
    return reloadPage ? 'reloaded' : 'unchanged'
  }

  await registration.update()

  if (registration.waiting) {
    if (updateServiceWorker) {
      await updateServiceWorker(true)
      return 'updated'
    }
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    if (reloadPage) window.location.reload()
    return 'updated'
  }

  if (reloadPage) window.location.reload()
  return reloadPage ? 'reloaded' : 'unchanged'
}