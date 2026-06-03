import localforage from 'localforage'
import type { StateStorage } from 'zustand/middleware'

const STORE_KEY = 'nilus-macro-store'

localforage.config({
  name: 'NilusMacroTracker',
  storeName: 'macro_data',
})

export const macroStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await localforage.getItem<string>(name)
    return value ?? null
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await localforage.setItem(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await localforage.removeItem(name)
  },
}

export const STORAGE_KEY = STORE_KEY

export async function clearAllStorage(): Promise<void> {
  await localforage.clear()
}