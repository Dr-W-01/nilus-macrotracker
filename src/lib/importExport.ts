import * as XLSX from 'xlsx'
import type { FoodItem } from './types'

export function parseFoodLibraryJson(text: string): FoodItem[] {
  const data = JSON.parse(text) as unknown
  if (Array.isArray(data)) return data as FoodItem[]
  if (data && typeof data === 'object' && 'foodLibrary' in data) {
    return (data as { foodLibrary: FoodItem[] }).foodLibrary
  }
  throw new Error('Invalid JSON format')
}

export function parseFoodLibraryCsv(text: string): FoodItem[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('CSV must have header and rows')
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const idx = (name: string) => headers.indexOf(name)

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim())
    const scaleType = (cols[idx('scaletype')] || 'count') as 'count' | 'scale'
    return {
      id: cols[idx('id')] || crypto.randomUUID(),
      name: cols[idx('name')] || 'Unknown',
      caloriesPerServing: parseFloat(cols[idx('calories')] || '0'),
      protein: parseFloat(cols[idx('protein')] || '0'),
      carbs: parseFloat(cols[idx('carbs')] || '0'),
      fat: parseFloat(cols[idx('fat')] || '0'),
      fiber: parseFloat(cols[idx('fiber')] || '0'),
      sugars: parseFloat(cols[idx('sugars')] || '0'),
      scaleType,
      unit: scaleType === 'scale' ? ((cols[idx('unit')] as 'g' | 'oz') || 'g') : undefined,
      servingDesc: cols[idx('servingdesc')] || '1 serving',
      categories: (cols[idx('categories')] || 'General').split(';').filter(Boolean),
      isRecipe: cols[idx('isrecipe')] === 'true',
      lastUsed: cols[idx('lastused')] || '2020-01-01',
      timesUsed: parseInt(cols[idx('timesused')] || '0', 10),
    } satisfies FoodItem
  })
}

export function parseFoodLibraryXlsx(buffer: ArrayBuffer): FoodItem[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
  return rows.map((row) => {
    const scaleType = String(row.scaleType || row.ScaleType || 'count') as 'count' | 'scale'
    return {
      id: String(row.id || row.ID || crypto.randomUUID()),
      name: String(row.name || row.Name || 'Unknown'),
      caloriesPerServing: Number(row.caloriesPerServing ?? row.calories ?? 0),
      protein: Number(row.protein ?? 0),
      carbs: Number(row.carbs ?? 0),
      fat: Number(row.fat ?? 0),
      fiber: Number(row.fiber ?? 0),
      sugars: Number(row.sugars ?? 0),
      scaleType,
      unit: scaleType === 'scale' ? (String(row.unit || 'g') as 'g' | 'oz') : undefined,
      servingDesc: String(row.servingDesc || row.serving || '1 serving'),
      categories: String(row.categories || 'General')
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      isRecipe: Boolean(row.isRecipe),
      lastUsed: String(row.lastUsed || '2020-01-01'),
      timesUsed: Number(row.timesUsed || 0),
    }
  })
}

export function exportFullBackup(data: object): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nilus-macro-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}