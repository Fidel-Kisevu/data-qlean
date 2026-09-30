import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

export function Panel({ children, className = '' }: Props) {
  return (
    <div
      className={`rounded-xl border border-cream-300 bg-white p-4 text-[13px] text-ink-700 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}
