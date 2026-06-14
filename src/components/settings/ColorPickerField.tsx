import { Input } from '@/components/ui/input'
import { mobilePlainTextInputProps } from '@/lib/mobileInput'
import { Label } from '@/components/ui/label'
import { normalizeHexColor } from '@/lib/theme'

interface ColorPickerFieldProps {
  id: string
  label: string
  description?: string
  value: string
  fallback: string
  onChange: (color: string) => void
}

export function ColorPickerField({
  id,
  label,
  description,
  value,
  fallback,
  onChange,
}: ColorPickerFieldProps) {
  const safe = normalizeHexColor(value, fallback)

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      )}
      <div className="mt-3 flex items-center gap-3">
        <input
          id={id}
          type="color"
          value={safe}
          onChange={(e) => onChange(normalizeHexColor(e.target.value, fallback))}
          className="h-12 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
          aria-label={`${label} picker`}
        />
        <Input
          {...mobilePlainTextInputProps}
          value={safe}
          onChange={(e) => onChange(normalizeHexColor(e.target.value, fallback))}
          className="font-mono text-sm uppercase"
          maxLength={7}
          autoCapitalize="characters"
        />
      </div>
    </div>
  )
}