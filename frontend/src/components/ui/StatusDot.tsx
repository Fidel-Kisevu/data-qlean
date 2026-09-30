// src/components/ui/StatusDot.tsx
type Color = 'green' | 'red' | 'amber' | 'purple' | 'default'

const colors: Record<Color, string> = {
  green:   'bg-emerald-500',
  red:     'bg-rose-500',
  amber:   'bg-amber-500',
  purple:  'bg-accent',
  default: 'bg-ink-400',
}

export function StatusDot({ color = 'default' }: { color?: Color }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colors[color]}`}
    />
  )
}