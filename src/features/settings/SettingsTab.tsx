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
import { exportFullBackup, parseFullBackup } from '@/lib/importExport'
import { clearAllStorage } from '@/lib/storage'
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_SECONDARY_TEXT_COLOR,
} from '@/lib/theme'
import { SignedDecimalInput } from '@/components/ui/signed-decimal-input'
import { formatTargetDeficitShort } from '@/lib/stats'
import type { GoalTemplate } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'
import { ColorPickerField } from '@/components/settings/ColorPickerField'

const ACCENT_PRESETS = ['#B22222', '#8B0000', '#CD5C5C', '#2563EB', '#16A34A']
const TEXT_PRESETS = ['#D1D1D1', '#C4C4C4', '#E5E5E5', '#A3A3A3', '#9CA3AF']

export function SettingsTab() {
  const settings = useMacroStore((s) => s.settings)
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const dailyLogs = useMacroStore((s) => s.dailyLogs)
  const customCategories = useMacroStore((s) => s.customCategories)
  const updateSettings = useMacroStore((s) => s.updateSettings)
  const loadSeedLibrary = useMacroStore((s) => s.loadSeedLibrary)
  const restoreFullBackup = useMacroStore((s) => s.restoreFullBackup)
  const addGoalTemplate = useMacroStore((s) => s.addGoalTemplate)
  const updateGoalTemplate = useMacroStore((s) => s.updateGoalTemplate)
  const deleteGoalTemplate = useMacroStore((s) => s.deleteGoalTemplate)
  const factoryReset = useMacroStore((s) => s.factoryReset)

  const backupFileRef = useRef<HTMLInputElement>(null)
  const [resetStep, setResetStep] = useState(0)
  const [editingGoal, setEditingGoal] = useState<GoalTemplate | null>(null)
  const [backupConfirmOpen, setBackupConfirmOpen] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<ReturnType<
    typeof parseFullBackup
  > | null>(null)

  const accentColor = settings.accentColor || DEFAULT_ACCENT_COLOR
  const secondaryTextColor =
    settings.secondaryTextColor ?? DEFAULT_SECONDARY_TEXT_COLOR

  const handleBackupFile = async (file: File) => {
    try {
      const backup = parseFullBackup(await file.text())
      setPendingBackup(backup)
      setBackupConfirmOpen(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not read backup file')
    }
  }

  const applyBackup = () => {
    if (!pendingBackup) return
    try {
      restoreFullBackup(pendingBackup)
      const foodCount = pendingBackup.foodLibrary?.length ?? 0
      const dayCount = Object.keys(pendingBackup.dailyLogs ?? {}).length
      const templateCount = pendingBackup.settings?.goalTemplates?.length ?? 0
      toast.success(
        `Backup restored: ${foodCount} foods, ${dayCount} daily logs, ${templateCount} goal template(s)`,
      )
      setBackupConfirmOpen(false)
      setPendingBackup(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Restore failed')
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
            <li
              key={g.id}
              className="rounded-lg border border-border p-3 flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {g.calories} cal intake
                  {formatTargetDeficitShort(g.targetDeficit)
                    ? ` · ${formatTargetDeficitShort(g.targetDeficit)}`
                    : ''}
                  {' · '}P{g.protein} C{g.carbs} F{g.fat}
                  {g.id === settings.defaultTemplateId && ' · Default'}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingGoal(g)}
                >
                  Edit
                </Button>
                {settings.goalTemplates.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      deleteGoalTemplate(g.id)
                      toast.success('Template deleted')
                    }}
                  >
                    Del
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            setEditingGoal({
              id: '',
              name: 'New Template',
              calories: 2000,
              targetDeficit: undefined,
              protein: 150,
              carbs: 200,
              fat: 65,
              fiber: 30,
              sugars: 50,
            })
          }
        >
          Create new template
        </Button>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Appearance</h2>
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
                outline:
                  accentColor.toUpperCase() === color.toUpperCase()
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

      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle>Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={backupFileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleBackupFile(f)
              e.target.value = ''
            }}
          />
          <Button
            className="w-full"
            variant="outline"
            onClick={() => backupFileRef.current?.click()}
          >
            Import Full Backup
          </Button>
          <p className="text-xs text-muted-foreground">
            Restores a JSON file from Export Everything (library, logs, settings,
            categories).
          </p>
          <Button
            className="w-full"
            onClick={() => {
              loadSeedLibrary()
              toast.success(`Loaded ${SEED_LIBRARY_COUNT} items`)
            }}
          >
            Load Demo Food Library ({SEED_LIBRARY_COUNT} items)
          </Button>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => {
              exportFullBackup({
                settings,
                foodLibrary,
                dailyLogs,
                customCategories,
                exportedAt: new Date().toISOString(),
              })
              toast.success('Backup downloaded')
            }}
          >
            Export Everything
          </Button>
          <Button
            className="w-full"
            variant="destructive"
            onClick={handleFactoryReset}
          >
            {resetStep === 0
              ? 'Factory Reset'
              : 'Confirm: Erase ALL data permanently'}
          </Button>
          {resetStep === 1 && (
            <p className="text-xs text-destructive text-center">
              Warning: This cannot be undone. Tap again to confirm.
            </p>
          )}
        </CardContent>
      </Card>

      <section className="text-center text-sm text-muted-foreground pb-8">
        <p className="font-semibold text-foreground">NullTracker</p>
        <p className="mt-2">Private, local-first macro tracking PWA.</p>
        <p className="mt-1">Built with React, Vite, and ❤️</p>
      </section>

      <Dialog open={backupConfirmOpen} onOpenChange={setBackupConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore full backup?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This replaces your current food library, daily logs, goal templates,
            and settings with the backup file.
          </p>
          {pendingBackup && (
            <ul className="text-sm space-y-1 rounded-lg bg-secondary/40 p-3">
              <li>{pendingBackup.foodLibrary?.length ?? 0} food items</li>
              <li>{Object.keys(pendingBackup.dailyLogs ?? {}).length} daily logs</li>
              <li>
                {pendingBackup.settings?.goalTemplates?.length ?? 0} goal templates
              </li>
              <li>{pendingBackup.customCategories?.length ?? 0} custom categories</li>
            </ul>
          )}
          <Button className="w-full" onClick={applyBackup}>
            Restore backup
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setBackupConfirmOpen(false)
              setPendingBackup(null)
            }}
          >
            Cancel
          </Button>
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
            if (!settings.defaultTemplateId)
              updateSettings({ defaultTemplateId: id })
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
        <DialogHeader>
          <DialogTitle>{goal.id ? 'Edit' : 'New'} template</DialogTitle>
        </DialogHeader>
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
            <Label className="text-xs">Target deficit / surplus (cal/day, optional)</Label>
            <SignedDecimalInput
              key={goal.id || 'new-goal'}
              placeholder="e.g. -1000 or 500"
              value={form.targetDeficit}
              onChange={(targetDeficit) => setForm({ ...form, targetDeficit })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Tap − then enter amount for deficit, or type a leading minus. Positive = surplus
              (e.g. 500). Stats uses intake − this value as implied maintenance.
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
        <Button
          className="w-full mt-4"
          onClick={() =>
            onSave({
              ...form,
              targetDeficit:
                form.targetDeficit === 0 ? undefined : form.targetDeficit,
            })
          }
        >
          Save
        </Button>
        {form.id && form.id !== defaultId && (
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => onSetDefault(form.id)}
          >
            Set as default
          </Button>
        )}
        <Button variant="ghost" className="w-full mt-2" onClick={onClose}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  )
}