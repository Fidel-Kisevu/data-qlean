import { useEffect, useRef } from 'react'

type ToolsMenuProps = {
  open: boolean
  busy: boolean
  columns: string[]
  onClose: () => void
  onOpenDialog: (kind: 'replace' | 'regex' | 'rename' | 'drop' | 'reorder') => void
  onAction: (action: string, params?: Record<string, unknown>) => void
  onResetToOriginal: () => void
  onCopyChangeLog: () => void
}

type MenuItem = {
  label: string
  action?: string
  kind?: 'replace' | 'regex' | 'rename' | 'drop' | 'reorder'
  params?: Record<string, unknown>
  danger?: boolean
}

type MenuSection = {
  label: string
  items: MenuItem[]
}

const SECTIONS: MenuSection[] = [
  {
    label: 'Table',
    items: [
      { label: 'Find & replace…', kind: 'replace' },
      { label: 'Regex replace…', kind: 'regex' },
    ],
  },
  {
    label: 'Rows',
    items: [
      { label: 'Remove duplicate rows', action: 'drop_duplicates_keep_first' },
      { label: 'Remove empty rows', action: 'drop_empty_rows' },
    ],
  },
  {
    label: 'Columns',
    items: [
      { label: 'Rename column…', kind: 'rename' },
      { label: 'Reorder columns…', kind: 'reorder' },
      { label: 'Drop column…', kind: 'drop' },
    ],
  },
  {
    label: 'Data',
    items: [
      { label: 'Reset to original', action: 'reset_to_original' },
      { label: 'Copy change log', action: 'copy_change_log' },
    ],
  },
]

export function ToolsMenu({
  open,
  busy,
  columns,
  onClose,
  onOpenDialog,
  onAction,
  onResetToOriginal,
  onCopyChangeLog,
}: ToolsMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (open) {
      document.addEventListener('mousedown', onClick)
      document.addEventListener('keydown', onKey)
    }

    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const menuWidth = 268
  const menuMaxHeight = 560

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-cream-200 bg-white shadow-[0_8px_32px_rgba(28,20,12,0.12),0_2px_8px_rgba(28,20,12,0.06)]"
      style={{ width: menuWidth, maxHeight: menuMaxHeight }}
    >
      <div className="flex items-center gap-2 border-b border-cream-100 bg-cream-50/70 px-3.5 py-2.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
        <p className="truncate font-mono text-[11.5px] font-medium text-ink-700">
          {columns.length > 0 ? `${columns.length} columns` : 'Dataset tools'}
        </p>
      </div>

      <div className="overflow-y-auto py-1.5" style={{ maxHeight: menuMaxHeight - 42 }}>
        {SECTIONS.map((section, sectionIndex) => (
          <div key={section.label}>
            {sectionIndex > 0 && <div className="my-1.5 border-t border-cream-100" />}
            <p className="px-3.5 pb-1 pt-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-ink-400">
              {section.label}
            </p>

            {section.items.map((item) => (
              <button
                key={`${section.label}-${item.label}`}
                type="button"
                disabled={busy}
                onClick={() => {
                  if (item.kind) {
                    onOpenDialog(item.kind)
                  } else if (item.action === 'reset_to_original') {
                    onResetToOriginal()
                  } else if (item.action === 'copy_change_log') {
                    onCopyChangeLog()
                  } else if (item.action) {
                    onAction(item.action)
                  }
                  onClose()
                }}
                className={`group flex w-full items-center justify-between px-3.5 py-[7px] text-left text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  item.danger
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-ink-700 hover:bg-cream-100 hover:text-ink-900'
                }`}
              >
                <span className="truncate">{item.label}</span>

                {(item.kind === 'replace' || item.kind === 'regex' || item.kind === 'rename' || item.kind === 'drop' || item.kind === 'reorder') && (
                  <span
                    className={`shrink-0 pl-3 text-[10px] transition-opacity ${
                      item.danger
                        ? 'text-rose-400'
                        : 'text-ink-300 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    ⋯
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
