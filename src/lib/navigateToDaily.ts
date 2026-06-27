import { todayString } from '@/lib/dates'
import { useMacroStore } from '@/store/useMacroStore'

/** Jump to Daily tab, ready to log food. */
export function navigateToDailyLogging() {
  const store = useMacroStore.getState()
  store.setCurrentDate(todayString())
  store.setCurrentTab('daily')
}

/** Open Daily tab and start the add flow for a library food item. */
export function navigateToDailyWithFood(foodId: string) {
  const store = useMacroStore.getState()
  store.setCurrentDate(todayString())
  store.setPendingLibraryFoodId(foodId)
  store.setCurrentTab('daily')
}