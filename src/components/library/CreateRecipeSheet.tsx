import { useMemo, useState } from 'react'
import { buildScaleLogPayload, getFoodBaseAmount } from '@/lib/scale'
import { Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ModalViewport,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetHeader,
  scrollSheetContentClass,
} from '@/components/ui/scroll-modal'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { QuantityInput } from '@/components/daily/QuantityInput'
import { computeComponentMacros, roundMacro } from '@/lib/macros'
import type { FoodItem } from '@/lib/types'
import { useMacroStore } from '@/store/useMacroStore'

interface CreateRecipeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateRecipeSheet({ open, onOpenChange }: CreateRecipeSheetProps) {
  const foodLibrary = useMacroStore((s) => s.foodLibrary)
  const addFoodItem = useMacroStore((s) => s.addFoodItem)
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [components, setComponents] = useState<{ food: FoodItem; quantity: number }[]>([])
  const [adding, setAdding] = useState<FoodItem | null>(null)
  const [addQty, setAddQty] = useState(1)
  const [addAmountEaten, setAddAmountEaten] = useState(1)

  const nonRecipes = useMemo(
    () =>
      foodLibrary
        .filter((f) => !f.isRecipe && f.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 20),
    [foodLibrary, query],
  )

  const totals = useMemo(
    () =>
      computeComponentMacros(
        foodLibrary,
        components.map((c) => ({ foodId: c.food.id, quantity: c.quantity })),
      ),
    [components, foodLibrary],
  )

  const save = () => {
    if (!name.trim()) {
      toast.error('Recipe name required')
      return
    }
    if (components.length === 0) {
      toast.error('Add at least one ingredient')
      return
    }
    addFoodItem({
      name: name.trim(),
      caloriesPerServing: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      fiber: totals.fiber,
      sugars: totals.sugars,
      scaleType: 'count',
      servingDesc: '1 recipe serving',
      categories: ['Recipes'],
      isRecipe: true,
      recipeComponents: components.map((c) => ({
        foodId: c.food.id,
        quantity: c.quantity,
      })),
    })
    toast.success('Recipe created')
    setName('')
    setComponents([])
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ModalViewport active={open} />
      <SheetContent
        side="bottom"
        className={scrollSheetContentClass}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollSheetHeader>
          <SheetTitle>Create Recipe</SheetTitle>
        </ScrollSheetHeader>
        <ScrollSheetBody className="space-y-4">
          <div>
            <Label>Recipe name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My meal..." />
          </div>

          {components.length > 0 && (
            <ul className="space-y-2">
              {components.map((c, i) => (
                <li key={c.food.id} className="flex justify-between items-center rounded-lg border px-3 py-2 text-sm">
                  <span>{c.food.name} × {c.quantity}</span>
                  <button type="button" onClick={() => setComponents((prev) => prev.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-lg bg-secondary/50 p-3 text-sm grid grid-cols-3 gap-2">
            <span>Cal: {roundMacro(totals.calories, 0)}</span>
            <span>P: {roundMacro(totals.protein)}g</span>
            <span>C: {roundMacro(totals.carbs)}g</span>
          </div>

          {adding ? (
            <div className="border rounded-xl p-4">
              <p className="font-medium mb-2">{adding.name}</p>
              <QuantityInput
                food={adding}
                note=""
                onNoteChange={() => {}}
                showNote={false}
                countQuantity={addQty}
                onCountQuantityChange={setAddQty}
                amountEaten={addAmountEaten}
                onAmountEatenChange={setAddAmountEaten}
              />
              <Button className="w-full mt-3" onClick={() => {
                const qty =
                  adding.scaleType === 'scale'
                    ? buildScaleLogPayload(adding, addAmountEaten).quantity
                    : Math.max(1, Math.round(addQty))
                setComponents((prev) => [...prev, { food: adding, quantity: qty }])
                setAdding(null)
                setAddQty(1)
                setAddAmountEaten(getFoodBaseAmount(adding))
              }}>Add ingredient</Button>
              <Button variant="ghost" className="w-full mt-1" onClick={() => setAdding(null)}>Cancel</Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search foods to add..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
              </div>
              <ul className="space-y-1">
                {nonRecipes.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      className="w-full text-left rounded-lg border px-3 py-2 text-sm hover:bg-secondary"
                      onClick={() => {
                        setAdding(f)
                        setAddQty(1)
                        setAddAmountEaten(getFoodBaseAmount(f))
                      }}
                    >
                      {f.name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </ScrollSheetBody>
        <ScrollSheetFooter>
          <Button size="lg" className="w-full" onClick={save} disabled={!name || components.length === 0}>
            Save Recipe
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </ScrollSheetFooter>
      </SheetContent>
    </Sheet>
  )
}