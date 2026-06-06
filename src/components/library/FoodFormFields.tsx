import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CategoryPicker } from '@/components/library/CategoryPicker'
import { normalizeCategoryList } from '@/lib/categories'
import { MACRO_DISPLAY_LABELS, MACRO_NUTRIENT_ORDER } from '@/lib/macroColors'
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
  categories: [],
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
    categories: normalizeCategoryList(
      Array.isArray(food.categories) ? food.categories : [],
    ),
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
    categories: normalizeCategoryList(values.categories),
  })
}

interface FoodFormFieldsProps {
  values: FoodFormValues
  onChange: (values: FoodFormValues) => void
  allCategories: string[]
  macrosReadOnly?: boolean
  scaleReadOnly?: boolean
}

export function FoodFormFields({
  values,
  onChange,
  allCategories,
  macrosReadOnly = false,
  scaleReadOnly = false,
}: FoodFormFieldsProps) {
  const patch = (partial: Partial<FoodFormValues>) =>
    onChange({ ...values, ...partial })

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
        {MACRO_NUTRIENT_ORDER.map((key) => (
          <MacroField
            key={key}
            label={`${MACRO_DISPLAY_LABELS[key]} (g)`}
            value={values[key]}
            readOnly={macrosReadOnly}
            onChange={(v) => patch({ [key]: v })}
          />
        ))}
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

      <CategoryPicker
        selected={values.categories}
        allCategories={allCategories}
        onChange={(categories) => patch({ categories })}
      />
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