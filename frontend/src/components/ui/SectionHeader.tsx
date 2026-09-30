import type { ReactNode } from 'react'

type Props = {
  eyebrow?: string
  title: string
  actions?: ReactNode
}

export function SectionHeader({ eyebrow, title, actions }: Props) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 text-base font-semibold tracking-tight text-ink-900">
          {title}
        </h2>
      </div>
      {actions}
    </div>
  )
}