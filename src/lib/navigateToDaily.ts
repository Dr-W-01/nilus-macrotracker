import { todayString } from '@/lib/dates'
import { useMacroStore } from '@/store/useMacroStore'

/** Jump to Daily tab in edit mode, ready to log food. */
export function navigateToDailyLogging() {
  const store = useMacroStore.getState()
  store.setCurrentDate(todayString())
  store.setEditDayMode(true)
  store.setCurrentTab('daily')
}

/** Open Daily tab and start the add flow for a library food item. */
export function navigateToDailyWithFood(foodId: string) {
  const store = useMacroStore.getState()
  store.setCurrentDate(todayString())
  store.setEditDayMode(true)
  store.setPendingLibraryFoodId(foodId)
  store.setCurrentTab('daily')
}