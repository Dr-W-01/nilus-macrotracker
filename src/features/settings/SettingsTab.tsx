import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SEED_LIBRARY_COUNT } from '@/data/seedLibrary'
import {
  exportFullBackup,
  parseFoodLibraryCsv,
  parseFoodLibraryJson,
  parseFoodLibraryXlsx,
} from '@/lib/importExport'
import { clearAllStorage } from '@/lib/storage'
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_SECONDARY_TEXT_COLOR,
} from '@/lib/theme'
import type { FoodItem, GoalTemplate } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'
import { ColorPickerField } from '@/components/settings/ColorPickerField'

const ACCENT_PRESETS = ['#B22222', '#8B0000', '#CD5C5C', '#2563EB', '#16A34A']
const TEXT_PRESETS = ['#D1D1D1', '#C4C4C4', '#E5E5E5', '#A3A3A3', '#9CA3AF']

export function SettingsTab() {
  const settings = useMacroStore((s) => s.settings)
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const dailyLogs = useMacroStore((s) => s.dailyLogs)
  const updateSettings = useMacroStore((s) => s.updateSettings)
  const loadSeedLibrary = useMacroStore((s) => s.loadSeedLibrary)
  const mergeFoodLibrary = useMacroStore((s) => s.mergeFoodLibrary)
  const addGoalTemplate = useMacroStore((s) => s.addGoalTemplate)
  const updateGoalTemplate = useMacroStore((s) => s.updateGoalTemplate)
  const deleteGoalTemplate = useMacroStore((s) => s.deleteGoalTemplate)
  const factoryReset = useMacroStore((s) => s.factoryReset)

  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<FoodItem[] | null>(null)
  const [resetStep, setResetStep] = useState(0)
  const [editingGoal, setEditingGoal] = useState<GoalTemplate | null>(null)

  const accentColor = settings.accentColor || DEFAULT_ACCENT_COLOR
  const secondaryTextColor =
    settings.secondaryTextColor ?? DEFAULT_SECONDARY_TEXT_COLOR

  const handleImportFile = async (file: File) => {
    try {
      let items: FoodItem[]
      if (file.name.endsWith('.json')) {
        items = parseFoodLibraryJson(await file.text())
      } else if (file.name.endsWith('.csv')) {
        items = parseFoodLibraryCsv(await file.text())
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        items = parseFoodLibraryXlsx(await file.arrayBuffer())
      } else {
        throw new Error('Unsupported file type')
      }
      setPreview(items)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed')
    }
  }

  const handleFactoryReset = async () => {
    if (resetStep === 0) {
      setResetStep(1)
      return
    }
    await clearAllStorage()
    factoryReset()
    setResetStep(0)
    toast.success('Factory reset complete')
  }

  return (
    <div className="p-4 pb-24 space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <section>
        <h2 className="font-semibold mb-3">Goals & Templates</h2>
        <ul className="space-y-2 mb-3">
          {settings.goalTemplates.map((g) => (
            <li key={g.id} className="rounded-lg border border-border p-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {g.calories} cal intake
                  {(g.targetDeficit ?? 0) > 0 ? ` · ${g.targetDeficit} def` : ''}
                  {' · '}P{g.protein} C{g.carbs} F{g.fat}
                  {g.id === settings.defaultTemplateId && ' · Default'}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditingGoal(g)}>Edit</Button>
                {settings.goalTemplates.length > 1 && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    deleteGoalTemplate(g.id)
                    toast.success('Template deleted')
                  }}>Del</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <Button variant="outline" className="w-full" onClick={() => setEditingGoal({
          id: '',
          name: 'New Template',
          calories: 2000,
          targetDeficit: undefined,
          protein: 150,
          carbs: 200,
          fat: 65,
          fiber: 30,
          sugars: 50,
        })}>Create new template</Button>
      </section>

      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle>Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".json,.csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleImportFile(f)
              e.target.value = ''
            }}
          />
          <Button className="w-full" variant="outline" onClick={() => fileRef.current?.click()}>
            Import Food Library (.json / .csv / .xlsx)
          </Button>
          <Button className="w-full" onClick={() => {
            loadSeedLibrary()
            toast.success(`Loaded ${SEED_LIBRARY_COUNT} items`)
          }}>
            Load Demo Food Library ({SEED_LIBRARY_COUNT} items)
          </Button>
          <Button className="w-full" variant="secondary" onClick={() => {
            exportFullBackup({
              settings,
              foodLibrary,
              dailyLogs,
              exportedAt: new Date().toISOString(),
            })
            toast.success('Backup downloaded')
          }}>
            Export Everything
          </Button>
          <Button
            className="w-full"
            variant="destructive"
            onClick={handleFactoryReset}
          >
            {resetStep === 0 ? 'Factory Reset' : 'Confirm: Erase ALL data permanently'}
          </Button>
          {resetStep === 1 && (
            <p className="text-xs text-destructive text-center">
              Warning: This cannot be undone. Tap again to confirm.
            </p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Theme & Colors</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize accent and text colors on the dark theme base.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant={settings.theme === 'dark' ? 'default' : 'outline'}
            onClick={() => updateSettings({ theme: 'dark' })}
          >
            Dark
          </Button>
          <Button
            className="flex-1"
            variant={settings.theme === 'light' ? 'default' : 'outline'}
            onClick={() => updateSettings({ theme: 'light' })}
          >
            Light
          </Button>
        </div>

        <ColorPickerField
          id="accent-color"
          label="Accent color"
          description="Buttons, active tab, highlights, links, and chart accents."
          value={accentColor}
          fallback={DEFAULT_ACCENT_COLOR}
          onChange={(color) => updateSettings({ accentColor: color })}
        />
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              className="h-9 w-9 rounded-full border-2 border-border"
              style={{
                background: color,
                outline: accentColor.toUpperCase() === color.toUpperCase()
                  ? '2px solid var(--foreground)'
                  : undefined,
              }}
              onClick={() => updateSettings({ accentColor: color })}
            />
          ))}
        </div>

        <ColorPickerField
          id="secondary-text-color"
          label="Secondary text color"
          description="Labels, hints, and grey text (including the Daily tab)."
          value={secondaryTextColor}
          fallback={DEFAULT_SECONDARY_TEXT_COLOR}
          onChange={(color) => updateSettings({ secondaryTextColor: color })}
        />
        <div className="flex flex-wrap gap-2">
          {TEXT_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              className="h-9 w-9 rounded-full border-2 border-border"
              style={{
                background: color,
                outline:
                  secondaryTextColor.toUpperCase() === color.toUpperCase()
                    ? '2px solid var(--foreground)'
                    : undefined,
              }}
              onClick={() => updateSettings({ secondaryTextColor: color })}
            />
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            updateSettings({
              accentColor: DEFAULT_ACCENT_COLOR,
              secondaryTextColor: DEFAULT_SECONDARY_TEXT_COLOR,
            })
          }
        >
          Reset colors to defaults
        </Button>
      </section>

      <section className="text-center text-sm text-muted-foreground pb-8">
        <p className="font-semibold text-foreground">Nilus AI: MacroTracker</p>
        <p className="mt-2">Private, local-first macro tracking PWA.</p>
        <p className="mt-1">Built with React, Vite, and ❤️</p>
      </section>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import preview ({preview?.length ?? 0} items)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Replace clears your library. Merge adds/updates items by id.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => {
              if (preview) mergeFoodLibrary(preview, true)
              setPreview(null)
              toast.success('Library replaced')
            }}>Replace library</Button>
            <Button variant="secondary" onClick={() => {
              if (preview) mergeFoodLibrary(preview, false)
              setPreview(null)
              toast.success('Library merged')
            }}>Merge into library</Button>
            <Button variant="ghost" onClick={() => setPreview(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      <GoalEditDialog
        goal={editingGoal}
        onClose={() => setEditingGoal(null)}
        onSave={(g) => {
          if (g.id) {
            updateGoalTemplate(g.id, g)
            toast.success('Template updated')
          } else {
            const id = addGoalTemplate(g)
            if (!settings.defaultTemplateId) updateSettings({ defaultTemplateId: id })
            toast.success('Template created')
          }
          setEditingGoal(null)
        }}
        onSetDefault={(id) => {
          updateSettings({ defaultTemplateId: id })
          toast.success('Default template set')
        }}
        defaultId={settings.defaultTemplateId}
      />
    </div>
  )
}

function GoalEditDialog({
  goal,
  onClose,
  onSave,
  onSetDefault,
  defaultId,
}: {
  goal: GoalTemplate | null
  onClose: () => void
  onSave: (g: GoalTemplate) => void
  onSetDefault: (id: string) => void
  defaultId: string
}) {
  const [form, setForm] = useState(goal)
  useEffect(() => {
    setForm(goal)
  }, [goal])
  if (!goal || !form) return null

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{goal.id ? 'Edit' : 'New'} template</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Target intake (cal/day)</Label>
            <Input
              type="number"
              min={0}
              value={String(form.calories)}
              onChange={(e) =>
                setForm({ ...form, calories: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Target deficit (cal/day, optional)</Label>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 1000"
              value={form.targetDeficit != null ? String(form.targetDeficit) : ''}
              onChange={(e) => {
                const raw = e.target.value.trim()
                setForm({
                  ...form,
                  targetDeficit: raw === '' ? undefined : parseFloat(raw) || 0,
                })
              }}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              When set, Stats measures deficit as (intake + deficit) − net calories.
            </p>
          </div>
          {(['protein', 'carbs', 'fat', 'fiber', 'sugars'] as const).map((key) => (
            <div key={key}>
              <Label className="text-xs capitalize">{key} (g)</Label>
              <Input
                type="number"
                min={0}
                value={String(form[key])}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [key]: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          ))}
        </div>
        <Button className="w-full mt-4" onClick={() => onSave(form)}>Save</Button>
        {form.id && form.id !== defaultId && (
          <Button variant="outline" className="w-full mt-2" onClick={() => onSetDefault(form.id)}>
            Set as default
          </Button>
        )}
        <Button variant="ghost" className="w-full mt-2" onClick={onClose}>Cancel</Button>
      </DialogContent>
    </Dialog>
  )
}