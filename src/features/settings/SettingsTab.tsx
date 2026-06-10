import { useEffect, useRef, useState } from 'react'
import { Download, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EditIconButton } from '@/components/ui/edit-icon-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  ModalViewport,
  ScrollDialogBody,
  ScrollDialogFooter,
  ScrollDialogHeader,
  scrollDialogContentClass,
} from '@/components/ui/scroll-modal'
import { exportFullBackup, parseFullBackup } from '@/lib/importExport'
import { clearAllStorage } from '@/lib/storage'
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_SECONDARY_TEXT_COLOR,
} from '@/lib/theme'
import { DeficitSurplusInput } from '@/components/settings/DeficitSurplusInput'
import { GOAL_MODE_OPTIONS } from '@/lib/goalMode'
import { MealListEditor } from '@/components/settings/MealListEditor'
import { MACRO_NUTRIENT_ORDER } from '@/lib/macroColors'
import { formatTargetDeficitShort } from '@/lib/stats'
import { parseWeightInput, weightFromKg } from '@/lib/weight'
import type { GoalMode, GoalTemplate, WeightUnit } from '@/lib/types'
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
    <div className="p-4 pb-below-nav space-y-6 settings-tab">
      <h1 className="text-xl font-bold">Settings</h1>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">Current Goal Mode</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Shapes Stats messaging and defaults. Does not change which goal template you use on
            Daily.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-secondary/50 p-1">
          {GOAL_MODE_OPTIONS.map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={(settings.goalMode ?? 'cut') === value ? 'default' : 'ghost'}
              className="h-10"
              onClick={() => updateSettings({ goalMode: value as GoalMode })}
            >
              {label}
            </Button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Goals & Templates</h2>
        <ul className="space-y-2 mb-3">
          {settings.goalTemplates.map((g) => {
            const isDefault = g.id === settings.defaultTemplateId
            const deficitLabel = formatTargetDeficitShort(g.targetDeficit)

            return (
              <li
                key={g.id}
                className="flex items-start gap-2 rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-medium leading-snug">
                    {g.name}
                    {isDefault && (
                      <span className="font-normal text-muted-foreground"> (Default)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {g.calories} cal intake
                    {deficitLabel ? ` · ${deficitLabel}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    P{g.protein} C{g.carbs} F{g.fat}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <EditIconButton
                    size="icon"
                    variant="outline"
                    className="h-10 w-10"
                    iconClassName="h-5 w-5"
                    label={`Edit ${g.name}`}
                    onClick={() => setEditingGoal(g)}
                  />
                  {settings.goalTemplates.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${g.name}`}
                      title={`Delete ${g.name}`}
                      onClick={() => {
                        deleteGoalTemplate(g.id)
                        toast.success('Template deleted')
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
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

      <section className="space-y-3">
        <h2 className="font-semibold">Daily meals</h2>
        <MealListEditor />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">Units</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Weight logged on the Daily tab uses this unit.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="flex-1"
            variant={(settings.weightUnit ?? 'lbs') === 'lbs' ? 'default' : 'outline'}
            onClick={() => updateSettings({ weightUnit: 'lbs' as WeightUnit })}
          >
            Pounds (lbs)
          </Button>
          <Button
            className="flex-1"
            variant={settings.weightUnit === 'kg' ? 'default' : 'outline'}
            onClick={() => updateSettings({ weightUnit: 'kg' })}
          >
            Kilograms (kg)
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="target-weight">Target weight (optional)</Label>
          <Input
            id="target-weight"
            type="number"
            min={0}
            inputMode="decimal"
            step={0.1}
            placeholder={`e.g. ${settings.weightUnit === 'kg' ? '75' : '165'}`}
            defaultValue={
              settings.targetWeightKg != null
                ? String(
                    weightFromKg(
                      settings.targetWeightKg,
                      settings.weightUnit ?? 'lbs',
                    ),
                  )
                : ''
            }
            onBlur={(e) => {
              const kg = parseWeightInput(e.target.value, settings.weightUnit ?? 'lbs')
              updateSettings({ targetWeightKg: kg })
              if (kg != null) {
                e.target.value = String(
                  weightFromKg(kg, settings.weightUnit ?? 'lbs'),
                )
                toast.success('Target weight saved')
              } else if (e.target.value.trim() === '') {
                updateSettings({ targetWeightKg: undefined })
                toast.success('Target weight cleared')
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Shown as a goal line on Stats → Weight.
          </p>
        </div>
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
        <CardHeader className="pb-3">
          <CardTitle>Data</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Back up or restore your library, logs, and settings.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => backupFileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
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
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Import restores a JSON file from Export (library, daily logs, settings,
            and categories).
          </p>
          <div className="border-t border-border pt-4">
            <Button
              className="w-full gap-2"
              variant="destructive"
              onClick={handleFactoryReset}
            >
              <Trash2 className="h-4 w-4" />
              {resetStep === 0
                ? 'Factory Reset'
                : 'Confirm: Erase ALL data permanently'}
            </Button>
            {resetStep === 1 && (
              <p className="mt-2 text-xs text-destructive text-center">
                Warning: This cannot be undone. Tap again to confirm.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="text-center text-sm text-muted-foreground pb-8">
        <p>
          <span className="font-semibold text-foreground">NullTracker.</span> Private,
          local-first macro tracking PWA. Built with React, Vite, and ☦️
        </p>
      </section>

      <Dialog open={backupConfirmOpen} onOpenChange={setBackupConfirmOpen}>
        <ModalViewport active={backupConfirmOpen} />
        <DialogContent className={scrollDialogContentClass}>
          <ScrollDialogHeader>
            <DialogTitle>Restore full backup?</DialogTitle>
          </ScrollDialogHeader>
          <ScrollDialogBody className="space-y-3 py-2">
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
          </ScrollDialogBody>
          <ScrollDialogFooter>
            <Button size="lg" className="w-full" onClick={applyBackup}>
              Restore backup
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setBackupConfirmOpen(false)
                setPendingBackup(null)
              }}
            >
              Cancel
            </Button>
          </ScrollDialogFooter>
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
      <ModalViewport active />
      <DialogContent
        className={scrollDialogContentClass}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollDialogHeader>
          <DialogTitle>{goal.id ? 'Edit' : 'New'} template</DialogTitle>
        </ScrollDialogHeader>
        <ScrollDialogBody className="space-y-2">
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
            <DeficitSurplusInput
              key={goal.id || 'new-goal'}
              value={form.targetDeficit}
              onChange={(targetDeficit) => setForm({ ...form, targetDeficit })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Choose Deficit or Surplus, then enter a positive amount. Stats compares your daily
              net calories (eaten − burned) to this signed target (e.g. −1000 deficit).
            </p>
          </div>
          {MACRO_NUTRIENT_ORDER.map((key) => (
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
        </ScrollDialogBody>
        <ScrollDialogFooter>
          <Button
            size="lg"
            className="w-full"
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
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => onSetDefault(form.id)}
            >
              Set as default
            </Button>
          )}
          <Button size="lg" variant="ghost" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </ScrollDialogFooter>
      </DialogContent>
    </Dialog>
  )
}