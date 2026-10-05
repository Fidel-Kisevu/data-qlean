import { useEffect, useRef } from 'react'

type ColumnMenuProps = {
  column: string
  x: number
  y: number
  busy: boolean
  onClose: () => void
  onAction: (action: string, params?: Record<string, unknown>) => void
  onOpenDialog: (action: 'replace_value' | 'regex_replace') => void
}

type MenuItem = {
  label: string
  action: string
  params?: Record<string, unknown>
  danger?: boolean
  shortcut?: string
}

type MenuSection = {
  label: string
  items: MenuItem[]
}

const SECTIONS: MenuSection[] = [
  {
    label: 'Text',
    items: [
      { label: 'Trim whitespace', action: 'trim' },
      { label: 'Collapse spaces', action: 'collapse_spaces' },
      { label: 'Uppercase', action: 'case_upper' },
      { label: 'Lowercase', action: 'case_lower' },
      { label: 'Title Case', action: 'case_title' },
      { label: 'Sentence case', action: 'case_sentence' },
      { label: 'Remove special chars', action: 'remove_special_chars' },
      { label: 'Find & replace…', action: 'replace_value' },
      { label: 'Regex replace…', action: 'regex_replace' },
    ],
  },
  {
    label: 'Missing values',
    items: [
      { label: 'Fill with median', action: 'fill_null_with_median' },
      { label: 'Fill with mean', action: 'fill_null_with_mean' },
      { label: 'Fill with mode', action: 'fill_null_with_mode' },
      { label: 'Forward fill', action: 'fill_null_forward' },
      { label: 'Backward fill', action: 'fill_null_backward' },
      { label: 'Interpolate', action: 'fill_null_interpolate' },
      { label: 'Flag as missing', action: 'flag_null_as_column' },
      { label: 'Drop rows with missing', action: 'drop_null_rows' },
    ],
  },
  {
    label: 'Type',
    items: [
      { label: 'To numeric', action: 'to_numeric' },
      { label: 'To integer', action: 'to_integer' },
      { label: 'To datetime', action: 'to_datetime' },
      { label: 'To ISO date', action: 'to_datetime_iso' },
      { label: 'Strip currency', action: 'strip_currency' },
      { label: 'Strip percent', action: 'strip_percent' },
    ],
  },
  {
    label: 'Sort',
    items: [
      { label: 'Sort ascending', action: 'sort', params: { ascending: true } },
      { label: 'Sort descending', action: 'sort', params: { ascending: false } },
    ],
  },
  {
    label: 'Danger',
    items: [
      { label: 'Drop this column', action: 'drop_column', danger: true },
    ],
  },
]

export function ColumnMenu({
  column,
  x,
  y,
  busy,
  onClose,
  onAction,
  onOpenDialog,
}: ColumnMenuProps) {
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
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const menuWidth = 268
  const menuMaxHeight = 560
  const left = Math.min(x, window.innerWidth - menuWidth - 12)
  const top = Math.min(y, window.innerHeight - menuMaxHeight - 12)

  return (
    <div
      ref={ref}
      className="fixed z-50 overflow-hidden rounded-xl border border-cream-200 bg-white shadow-[0_8px_32px_rgba(28,20,12,0.12),0_2px_8px_rgba(28,20,12,0.06)]"
      style={{ left, top, width: menuWidth, maxHeight: menuMaxHeight }}
    >
      {/* Header — column name */}
      <div className="flex items-center gap-2 border-b border-cream-100 bg-cream-50/70 px-3.5 py-2.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
        <p className="truncate font-mono text-[11.5px] font-medium text-ink-700">
          {column}
        </p>
      </div>

      {/* Sections */}
      <div
        className="overflow-y-auto py-1.5"
        style={{ maxHeight: menuMaxHeight - 42 }}
      >
        {SECTIONS.map((section, sIdx) => (
          <div key={section.label}>
            {sIdx > 0 && (
              <div className="my-1.5 border-t border-cream-100" />
            )}
            <p className="px-3.5 pt-1 pb-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-ink-400">
              {section.label}
            </p>

            {section.items.map((item) => (
              <button
                key={`${item.action}-${item.label}`}
                type="button"
                disabled={busy}
                onClick={() => {
                  if (
                    item.action === 'replace_value' ||
                    item.action === 'regex_replace'
                  ) {
                    onOpenDialog(
                      item.action as 'replace_value' | 'regex_replace'
                    )
                  } else {
                    onAction(item.action, item.params)
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

                {/* Trailing hint — chevron for dialogs, nothing for direct actions */}
                {(item.action === 'replace_value' ||
                  item.action === 'regex_replace') && (
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