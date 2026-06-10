import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import 'react-day-picker/style.css'
import AppPage from '@/app/page'
import { AppLayout } from '@/app/layout'
import { clearReloadParam, performHardReload } from '@/lib/pwaUpdate'

clearReloadParam()

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    performHardReload()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppLayout>
      <AppPage />
    </AppLayout>
  </StrictMode>,
)