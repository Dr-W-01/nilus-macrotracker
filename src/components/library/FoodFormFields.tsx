import { Button } from '@/components/ui/button'
import { FormSection } from '@/components/ui/form-section'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CategoryPicker } from '@/components/library/CategoryPicker'
import { normalizeCategoryList } from '@/lib/categories'
import {
  FORM_MACRO_NUTRIENT_ORDER,
  MACRO_DISPLAY_LABELS,
} from '@/lib/macroColors'
import {
  inferBaseAmountFromServing,
  normalizeScaleFoodItem,
} from '@/lib/scale'
import type { FoodItem } from '@/lib/types'
import { cn } from '@/lib/utils'

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

  const nutritionDescription =
    values.scaleType === 'scale' && !scaleReadOnly
      ? `Per ${values.baseAmount || '1'} ${values.baseUnit} (base serving).`
      : 'Values per serving, like a nutrition facts label.'

  return (
    <div className="space-y-5">
      <FormField label="Name" htmlFor="food-name" required>
        <Input
          id="food-name"
          value={values.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Food name"
        />
      </FormField>

      <FormSection variant="flat" title="Nutrition facts" description={nutritionDescription}>
        <FormField label="Calories" htmlFor="food-calories">
          <Input
            id="food-calories"
            type="number"
            inputMode="decimal"
            value={values.calories}
            disabled={macrosReadOnly}
            onChange={(e) => patch({ calories: e.target.value })}
            className="font-semibold tabular-nums"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          {FORM_MACRO_NUTRIENT_ORDER.map((key) => (
            <FormField
              key={key}
              label={`${MACRO_DISPLAY_LABELS[key]} (g)`}
              htmlFor={`food-${key}`}
            >
              <Input
                id={`food-${key}`}
                type="number"
                inputMode="decimal"
                className="tabular-nums"
                value={values[key]}
                disabled={macrosReadOnly}
                onChange={(e) => patch({ [key]: e.target.value })}
              />
            </FormField>
          ))}
        </div>

        {macrosReadOnly && (
          <p className="text-xs leading-snug text-muted-foreground">
            Macros are calculated from recipe components.
          </p>
        )}
      </FormSection>

      {!scaleReadOnly && (
        <FormSection
          variant="flat"
          title="Serving type"
          description="Count for discrete items; scale for weight-based foods."
        >
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Scale type">
            <Button
              type="button"
              variant={values.scaleType === 'count' ? 'default' : 'outline'}
              className={cn(
                'h-10',
                values.scaleType === 'count' && 'ring-1 ring-primary/25',
              )}
              onClick={() => patch({ scaleType: 'count' })}
            >
              Count
            </Button>
            <Button
              type="button"
              variant={values.scaleType === 'scale' ? 'default' : 'outline'}
              className={cn(
                'h-10',
                values.scaleType === 'scale' && 'ring-1 ring-primary/25',
              )}
              onClick={() => patch({ scaleType: 'scale' })}
            >
              Scale
            </Button>
          </div>

          {values.scaleType === 'scale' && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Base amount" htmlFor="food-base-amount">
                <Input
                  id="food-base-amount"
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step={0.01}
                  value={values.baseAmount}
                  onChange={(e) => patch({ baseAmount: e.target.value })}
                  placeholder="e.g. 4"
                />
              </FormField>
              <FormField label="Base unit" htmlFor="base-unit">
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
          )}
        </FormSection>
      )}

      <FormField
        label="Serving description"
        htmlFor="food-serving-desc"
        hint="How you describe one serving"
      >
        <Input
          id="food-serving-desc"
          value={values.servingDesc}
          onChange={(e) => patch({ servingDesc: e.target.value })}
          placeholder="e.g. 1 medium apple, per 28g"
        />
      </FormField>

      <FormSection variant="flat" title="Categories">
        <CategoryPicker
          selected={values.categories}
          allCategories={allCategories}
          onChange={(categories) => patch({ categories })}
        />
      </FormSection>
    </div>
  )
}

function FormField({
  label,
  children,
  required,
  hint,
  htmlFor,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  hint?: string
  htmlFor?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-primary"> *</span>}
      </Label>
      {hint && (
        <p className="text-xs leading-snug text-muted-foreground/90">{hint}</p>
      )}
      {children}
    </div>
  )
}