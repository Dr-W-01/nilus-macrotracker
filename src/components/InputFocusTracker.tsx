import { useEffect } from 'react'
import { useMacroStore } from '@/store/useMacroStore'

function isTextInput(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  )
}

/** Tracks focused text inputs app-wide to hide bottom nav and reduce keyboard chrome. */
export function InputFocusTracker() {
  const setInputFocusEngaged = useMacroStore((s) => s.setInputFocusEngaged)

  useEffect(() => {
    const sync = () => {
      setInputFocusEngaged(isTextInput(document.activeElement))
    }

    const onFocusIn = (e: FocusEvent) => {
      if (isTextInput(e.target as Element)) {
        setInputFocusEngaged(true)
      }
    }

    const onFocusOut = () => {
      window.setTimeout(sync, 0)
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    sync()

    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      setInputFocusEngaged(false)
    }
  }, [setInputFocusEngaged])

  return null
}