import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useMacroStore } from '@/store/useMacroStore'
import type { FoodItem } from '@/lib/types'

interface NewFoodSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewFoodSheet({ open, onOpenChange }: NewFoodSheetProps) {
  const addFoodItem = useMacroStore((s) => s.addFoodItem)
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('100')
  const [protein, setProtein] = useState('0')
  const [carbs, setCarbs] = useState('0')
  const [fat, setFat] = useState('0')
  const [fiber, setFiber] = useState('0')
  const [sugars, setSugars] = useState('0')
  const [scaleType, setScaleType] = useState<'count' | 'scale'>('count')
  const [unit, setUnit] = useState<'g' | 'oz'>('g')
  const [servingDesc, setServingDesc] = useState('1 serving')
  const [categories, setCategories] = useState('General')

  const reset = () => {
    setName('')
    setCalories('100')
    setProtein('0')
    setCarbs('0')
    setFat('0')
    setFiber('0')
    setSugars('0')
    setScaleType('count')
    setServingDesc('1 serving')
    setCategories('General')
  }

  const save = () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    const item: Omit<FoodItem, 'id' | 'lastUsed' | 'timesUsed'> = {
      name: name.trim(),
      caloriesPerServing: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      fiber: parseFloat(fiber) || 0,
      sugars: parseFloat(sugars) || 0,
      scaleType,
      unit: scaleType === 'scale' ? unit : undefined,
      servingDesc,
      categories: categories.split(/[,;]/).map((s) => s.trim()).filter(Boolean),
      isRecipe: false,
    }
    addFoodItem(item)
    toast.success('Food added')
    reset()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
        <SheetHeader><SheetTitle>New Food</SheetTitle></SheetHeader>
        <div className="space-y-3 py-2">
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Calories / serving" value={calories} onChange={setCalories} type="number" />
          <div className="grid grid-cols-3 gap-2">
            <Field label="Protein" value={protein} onChange={setProtein} type="number" />
            <Field label="Carbs" value={carbs} onChange={setCarbs} type="number" />
            <Field label="Fat" value={fat} onChange={setFat} type="number" />
          </div>
          <Field label="Serving description" value={servingDesc} onChange={setServingDesc} />
          <Field label="Categories (comma-separated)" value={categories} onChange={setCategories} />
          <div className="flex gap-2">
            <Button variant={scaleType === 'count' ? 'default' : 'outline'} className="flex-1" onClick={() => setScaleType('count')}>Count</Button>
            <Button variant={scaleType === 'scale' ? 'default' : 'outline'} className="flex-1" onClick={() => setScaleType('scale')}>Scale</Button>
          </div>
          {scaleType === 'scale' && (
            <div className="flex gap-2">
              <Button variant={unit === 'g' ? 'default' : 'outline'} className="flex-1" onClick={() => setUnit('g')}>grams (g)</Button>
              <Button variant={unit === 'oz' ? 'default' : 'outline'} className="flex-1" onClick={() => setUnit('oz')}>oz</Button>
            </div>
          )}
        </div>
        <Button size="lg" className="w-full mt-4" onClick={save}>Save Food</Button>
        <Button variant="ghost" className="w-full mt-2" onClick={() => onOpenChange(false)}>Cancel</Button>
      </SheetContent>
    </Sheet>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  )
}