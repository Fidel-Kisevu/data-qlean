import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:opacity-90 active:opacity-95',
  secondary:
    'border border-cream-300 bg-white text-ink-700 hover:bg-cream-100',
  ghost:
    'text-ink-500 hover:bg-cream-100 hover:text-ink-700',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}