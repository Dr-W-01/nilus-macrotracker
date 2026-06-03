import { useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  inferBaseAmountFromServing,
  normalizeScaleFoodItem,
} from '@/lib/scale'
import type { FoodItem } from '@/lib/types'

export interface FoodFormValues {
  name: string
  calories: string
  protein: string
  carbs: string
  fat: string
  fiber: string
  sugars: string
  scaleType: 'count' | 'scale'
  baseUnit: 'g' | 'oz'
  baseAmount: string
  servingDesc: string
  categories: string[]
}

export const emptyFoodFormValues = (): FoodFormValues => ({
  name: '',
  calories: '100',
  protein: '0',
  carbs: '0',
  fat: '0',
  fiber: '0',
  sugars: '0',
  scaleType: 'count',
  baseUnit: 'g',
  baseAmount: '1',
  servingDesc: '1 serving',
  categories: ['General'],
})

export function foodItemToFormValues(food: FoodItem): FoodFormValues {
  return {
    name: food.name,
    calories: String(food.caloriesPerServing),
    protein: String(food.protein),
    carbs: String(food.carbs),
    fat: String(food.fat),
    fiber: String(food.fiber),
    sugars: String(food.sugars),
    scaleType: food.scaleType,
    baseUnit: food.baseUnit ?? food.unit ?? 'g',
    baseAmount: String(
      food.baseAmount ??
        inferBaseAmountFromServing(food.servingDesc, food.baseUnit ?? food.unit),
    ),
    servingDesc: food.servingDesc,
    categories: food.categories.length > 0 ? [...food.categories] : ['General'],
  }
}

export function formValuesToFoodFields(
  values: FoodFormValues,
): Omit<FoodItem, 'id' | 'lastUsed' | 'timesUsed' | 'isRecipe' | 'recipeComponents'> {
  return normalizeScaleFoodItem({
    name: values.name.trim(),
    caloriesPerServing: parseFloat(values.calories) || 0,
    protein: parseFloat(values.protein) || 0,
    carbs: parseFloat(values.carbs) || 0,
    fat: parseFloat(values.fat) || 0,
    fiber: parseFloat(values.fiber) || 0,
    sugars: parseFloat(values.sugars) || 0,
    scaleType: values.scaleType,
    baseUnit: values.scaleType === 'scale' ? values.baseUnit : undefined,
    unit: values.scaleType === 'scale' ? values.baseUnit : undefined,
    baseAmount:
      values.scaleType === 'scale'
        ? parseFloat(values.baseAmount) || 1
        : undefined,
    servingDesc: values.servingDesc.trim() || '1 serving',
    categories: values.categories.length > 0 ? values.categories : ['General'],
  })
}

interface FoodFormFieldsProps {
  values: FoodFormValues
  onChange: (values: FoodFormValues) => void
  macrosReadOnly?: boolean
  scaleReadOnly?: boolean
}

export function FoodFormFields({
  values,
  onChange,
  macrosReadOnly = false,
  scaleReadOnly = false,
}: FoodFormFieldsProps) {
  const [categoryInput, setCategoryInput] = useState('')

  const patch = (partial: Partial<FoodFormValues>) =>
    onChange({ ...values, ...partial })

  const addCategory = (raw: string) => {
    const tag = raw.trim()
    if (!tag) return
    if (values.categories.some((c) => c.toLowerCase() === tag.toLowerCase())) {
      setCategoryInput('')
      return
    }
    patch({ categories: [...values.categories, tag] })
    setCategoryInput('')
  }

  const removeCategory = (tag: string) => {
    const next = values.categories.filter((c) => c !== tag)
    patch({ categories: next.length > 0 ? next : ['General'] })
  }

  return (
    <div className="space-y-4">
      <FormField label="Name *" required>
        <Input
          value={values.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Food name"
        />
      </FormField>

      <FormField label="Calories per serving">
        <Input
          type="number"
          inputMode="decimal"
          value={values.calories}
          disabled={macrosReadOnly}
          onChange={(e) => patch({ calories: e.target.value })}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MacroField label="Protein (g)" value={values.protein} readOnly={macrosReadOnly} onChange={(v) => patch({ protein: v })} />
        <MacroField label="Carbs (g)" value={values.carbs} readOnly={macrosReadOnly} onChange={(v) => patch({ carbs: v })} />
        <MacroField label="Fat (g)" value={values.fat} readOnly={macrosReadOnly} onChange={(v) => patch({ fat: v })} />
        <MacroField label="Fiber (g)" value={values.fiber} readOnly={macrosReadOnly} onChange={(v) => patch({ fiber: v })} />
        <MacroField label="Sugars (g)" value={values.sugars} readOnly={macrosReadOnly} onChange={(v) => patch({ sugars: v })} />
      </div>

      {macrosReadOnly && (
        <p className="text-xs text-muted-foreground">
          Macros are calculated from recipe components.
        </p>
      )}

      {!scaleReadOnly && (
        <>
          <div>
            <Label className="text-xs text-muted-foreground">Scale type</Label>
            <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Scale type">
              <Button
                type="button"
                variant={values.scaleType === 'count' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => patch({ scaleType: 'count' })}
              >
                Count
              </Button>
              <Button
                type="button"
                variant={values.scaleType === 'scale' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => patch({ scaleType: 'scale' })}
              >
                Scale
              </Button>
            </div>
          </div>

          {values.scaleType === 'scale' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Base amount">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0.01}
                    step={0.01}
                    value={values.baseAmount}
                    onChange={(e) => patch({ baseAmount: e.target.value })}
                    placeholder="e.g. 4"
                  />
                </FormField>
                <FormField label="Base unit">
                  <select
                    id="base-unit"
                    aria-label="Base unit"
                    value={values.baseUnit}
                    onChange={(e) =>
                      patch({ baseUnit: e.target.value === 'oz' ? 'oz' : 'g' })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="g">g</option>
                    <option value="oz">oz</option>
                  </select>
                </FormField>
              </div>
              <p className="text-xs text-muted-foreground">
                Macros above are per {values.baseAmount || '1'} {values.baseUnit} (base serving).
              </p>
            </>
          )}
        </>
      )}

      <FormField label="Serving description">
        <Input
          value={values.servingDesc}
          onChange={(e) => patch({ servingDesc: e.target.value })}
          placeholder="e.g. 1 medium apple, per 28g"
        />
      </FormField>

      <div>
        <Label className="text-xs text-muted-foreground">Categories</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {values.categories.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-sm">
              {tag}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-background/50"
                aria-label={`Remove ${tag}`}
                onClick={() => removeCategory(tag)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            placeholder="Add category..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCategory(categoryInput)
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => addCategory(categoryInput)}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}

function FormField({
  label,
  children,
  required,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="text-primary"> *</span>}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function MacroField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        className="mt-1"
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}