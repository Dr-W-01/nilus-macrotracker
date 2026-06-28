import { useEffect, useRef, useState } from 'react'
import { Download, RefreshCw, Settings, Trash2, Upload } from 'lucide-react'
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
  accentPresetsForTheme,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_LIGHT_SECONDARY_TEXT_COLOR,
  DEFAULT_SECONDARY_TEXT_COLOR,
  isDarkThemeSecondaryColor,
  secondaryPresetsForTheme,
} from '@/lib/theme'
import { DeficitSurplusInput } from '@/components/settings/DeficitSurplusInput'
import { LoggedMacroPreview } from '@/components/daily/LoggedMacroPreview'
import { FactoryResetDialog } from '@/components/settings/FactoryResetDialog'
import { MealListEditor } from '@/components/settings/MealListEditor'
import { TrackingToggle } from '@/components/settings/TrackingToggle'
import {
  isTrackBurnedCaloriesEnabled,
  isTrackCurrentWeightEnabled,
} from '@/lib/trackingSettings'
import { MACRO_NUTRIENT_ORDER } from '@/lib/macroColors'
import { formatTargetDeficitShort } from '@/lib/stats'
import { parseWeightInput, weightFromKg } from '@/lib/weight'
import type { GoalTemplate, WeightUnit } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'
import { ColorPickerField } from '@/components/settings/ColorPickerField'
import { useAppUpdateState } from '@/hooks/useAppUpdateState'
import { runManualUpdateCheck } from '@/lib/pwaUpdate'
import { SURFACE_GRADIENT_COMPACT, SURFACE_GRADIENT_ROUNDED } from '@/lib/surfaceStyles'
import { cn } from '@/lib/utils'

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
  const [factoryResetOpen, setFactoryResetOpen] = useState(false)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalTemplate | null>(null)
  const [backupConfirmOpen, setBackupConfirmOpen] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<ReturnType<
    typeof parseFullBackup
  > | null>(null)

  const accentColor = settings.accentColor || DEFAULT_ACCENT_COLOR
  const secondaryTextColor =
    settings.secondaryTextColor ?? DEFAULT_SECONDARY_TEXT_COLOR
  const accentPresets = accentPresetsForTheme()
  const textPresets = secondaryPresetsForTheme(settings.theme)
  const { updateAvailable, lastUpdatedLabel } = useAppUpdateState()

  const setTheme = (theme: 'dark' | 'light') => {
    const patch: Parameters<typeof updateSettings>[0] = { theme }
    const currentSecondary = (settings.secondaryTextColor ?? DEFAULT_SECONDARY_TEXT_COLOR).toUpperCase()
    const lightSecondaryPresets = new Set(
      secondaryPresetsForTheme('light').map((c) => c.toUpperCase()),
    )
    if (theme === 'light' && isDarkThemeSecondaryColor(currentSecondary)) {
      patch.secondaryTextColor = '#000000'
    }
    if (theme === 'dark' && lightSecondaryPresets.has(currentSecondary)) {
      patch.secondaryTextColor = DEFAULT_SECONDARY_TEXT_COLOR
    }
    updateSettings(patch)
  }

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

  const handleCheckForUpdates = async () => {
    if (checkingUpdate) return
    setCheckingUpdate(true)
    try {
      await runManualUpdateCheck()
    } finally {
      setCheckingUpdate(false)
    }
  }

  const handleFactoryReset = async () => {
    await clearAllStorage()
    factoryReset()
    setFactoryResetOpen(false)
    toast.success('Factory reset complete')
  }

  return (
    <div className="settings-tab">
      <header className="tab-sticky-header">
        <div className="tab-title-row">
          <Settings className="h-4 w-4 text-primary" aria-hidden />
          <h1 className="tab-title-heading">Settings</h1>
        </div>
      </header>

      <div className="space-y-6 p-4">
      <section className={cn(SURFACE_GRADIENT_ROUNDED, 'p-4')}>
        <h2 className="mb-3 text-sm font-semibold">Goals & Templates</h2>
        <ul className="space-y-2 mb-3">
          {settings.goalTemplates.map((g) => {
            const isDefault = g.id === settings.defaultTemplateId
            const deficitLabel = formatTargetDeficitShort(g.targetDeficit)

            return (
              <li
                key={g.id}
                className={cn(SURFACE_GRADIENT_COMPACT, 'flex items-start gap-2 p-3')}
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
                  <LoggedMacroPreview
                    macros={{
                      calories: g.calories,
                      protein: g.protein,
                      carbs: g.carbs,
                      fat: g.fat,
                      fiber: g.fiber,
                      sugars: g.sugars,
                    }}
                    size="sm"
                    className="leading-snug"
                  />
                </div>
                <div className="flex shrink-0 gap-1">
                  <EditIconButton
                    size="icon"
                    className="h-8 w-8"
                    iconClassName="h-4 w-4"
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
          size="sm"
          className="h-7 min-h-7 w-full text-xs"
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

        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            Turn features off to hide them in Daily and Stats. Your logged data is always kept.
          </p>
          <TrackingToggle
            label="Track current weight"
            description="Show weight logging on the Daily tab and weight charts in Stats."
            checked={isTrackCurrentWeightEnabled(settings)}
            onCheckedChange={(checked) =>
              updateSettings({ trackCurrentWeight: checked })
            }
          />
          <TrackingToggle
            label="Track burned calories"
            description="Show burned calories on the Daily tab and net calorie trends in Stats."
            checked={isTrackBurnedCaloriesEnabled(settings)}
            onCheckedChange={(checked) =>
              updateSettings({ trackBurnedCalories: checked })
            }
          />
        </div>
      </section>

      {isTrackCurrentWeightEnabled(settings) && (
      <section className={cn(SURFACE_GRADIENT_ROUNDED, 'space-y-3 p-4')}>
        <div>
          <h2 className="text-sm font-semibold">Units</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Weight logged on the Daily tab uses this unit.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            className="h-7 min-h-7 flex-1 text-xs"
            variant={(settings.weightUnit ?? 'lbs') === 'lbs' ? 'default' : 'outline'}
            onClick={() => updateSettings({ weightUnit: 'lbs' as WeightUnit })}
          >
            Pounds (lbs)
          </Button>
          <Button
            size="sm"
            className="h-7 min-h-7 flex-1 text-xs"
            variant={settings.weightUnit === 'kg' ? 'default' : 'outline'}
            onClick={() => updateSettings({ weightUnit: 'kg' })}
          >
            Kilograms (kg)
          </Button>
        </div>
      </section>
      )}

      {isTrackCurrentWeightEnabled(settings) && (
      <section className={cn(SURFACE_GRADIENT_ROUNDED, 'space-y-3 p-4')}>
        <div>
          <h2 className="text-sm font-semibold">Target weight</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional goal line on the weight chart in Stats → Trends.
          </p>
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
        </div>
      </section>
      )}

      <section className={cn(SURFACE_GRADIENT_ROUNDED, 'space-y-2 p-3')}>
        <h2 className="text-sm font-semibold">Daily meals</h2>
        <MealListEditor />
      </section>

      <section className={cn(SURFACE_GRADIENT_ROUNDED, 'space-y-3 p-3')}>
        <div>
          <h2 className="text-sm font-semibold">Appearance</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Customize accent and secondary text colors for the active theme.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-7 min-h-7 flex-1 text-xs"
            variant={settings.theme === 'dark' ? 'default' : 'outline'}
            onClick={() => setTheme('dark')}
          >
            Dark
          </Button>
          <Button
            size="sm"
            className="h-7 min-h-7 flex-1 text-xs"
            variant={settings.theme === 'light' ? 'default' : 'outline'}
            onClick={() => setTheme('light')}
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
          presets={accentPresets}
          onChange={(color) => updateSettings({ accentColor: color })}
        />
        <div className="flex flex-wrap items-center justify-center gap-2">
          {accentPresets.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              className="h-7 w-7 shrink-0 rounded-full border-2 border-border"
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
          fallback={
            settings.theme === 'light'
              ? DEFAULT_LIGHT_SECONDARY_TEXT_COLOR
              : DEFAULT_SECONDARY_TEXT_COLOR
          }
          presets={textPresets}
          onChange={(color) => updateSettings({ secondaryTextColor: color })}
        />
        <div className="flex flex-wrap items-center justify-center gap-2">
          {textPresets.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              className="h-7 w-7 shrink-0 rounded-full border-2 border-border"
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
          size="sm"
          className="h-7 min-h-7 w-full text-xs"
          onClick={() =>
            updateSettings({
              accentColor: DEFAULT_ACCENT_COLOR,
              secondaryTextColor:
                settings.theme === 'light'
                  ? DEFAULT_LIGHT_SECONDARY_TEXT_COLOR
                  : DEFAULT_SECONDARY_TEXT_COLOR,
            })
          }
        >
          Reset colors to defaults
        </Button>
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold leading-snug tracking-normal">Data</CardTitle>
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
        </CardContent>
      </Card>

      <section className="space-y-3">
        <Card
          className={cn(
            'overflow-hidden border-emerald-600/25 bg-emerald-500/10',
            updateAvailable && 'ring-2 ring-emerald-500/40',
          )}
        >
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">App updates</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {updateAvailable
                    ? 'A new version is ready to install.'
                    : 'Check for the latest improvements and fixes.'}
                </p>
              </div>
              {updateAvailable && (
                <span className="shrink-0 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  New
                </span>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              className={cn(
                'h-10 min-h-10 w-full gap-2 text-sm font-semibold shadow-md',
                'bg-emerald-600 text-white hover:bg-emerald-500',
                'focus-visible:ring-emerald-500',
                checkingUpdate && 'opacity-90',
              )}
              disabled={checkingUpdate}
              aria-busy={checkingUpdate}
              onClick={handleCheckForUpdates}
            >
              <RefreshCw
                className={cn('h-4 w-4 shrink-0', checkingUpdate && 'animate-spin')}
              />
              {checkingUpdate
                ? 'Checking for updates…'
                : updateAvailable
                  ? 'Install update'
                  : 'Check for updates'}
            </Button>
            {lastUpdatedLabel ? (
              <p className="text-center text-xs text-muted-foreground">
                Last updated: {lastUpdatedLabel}
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Last updated: not recorded yet
              </p>
            )}
          </CardContent>
        </Card>
        <Button
          className="h-11 w-full gap-2"
          variant="destructive"
          onClick={() => setFactoryResetOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Factory Reset
        </Button>
      </section>

      <FactoryResetDialog
        open={factoryResetOpen}
        onOpenChange={setFactoryResetOpen}
        onConfirm={handleFactoryReset}
      />

      <section className="text-center text-sm text-muted-foreground pb-8">
        <p>
          <span className="font-semibold text-foreground">NullTracker.</span> Private,
          local-first macro tracking PWA. Built with React, Vite, and ☦️
        </p>
      </section>
      </div>

      <Dialog open={backupConfirmOpen} onOpenChange={setBackupConfirmOpen}>
        <ModalViewport
          active={backupConfirmOpen}
          onRequestClose={() => {
            setBackupConfirmOpen(false)
            setPendingBackup(null)
          }}
        />
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
      <ModalViewport active onRequestClose={onClose} />
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