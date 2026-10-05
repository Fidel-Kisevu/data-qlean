import { useState } from 'react'

type ReplaceDialogProps = {
  column: string | null
  mode: 'plain' | 'regex'
  busy: boolean
  onClose: () => void
  onApply: (params: Record<string, unknown>) => void
}

export function ReplaceDialog({
  column,
  mode,
  busy,
  onClose,
  onApply,
}: ReplaceDialogProps) {
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(mode === 'regex')

  const canApply = find.length > 0 && !busy

  const handleApply = () => {
    if (!canApply) return
    if (mode === 'plain') {
      onApply({ find, replace, case_sensitive: caseSensitive })
    } else {
      onApply({ pattern: find, replace, case_sensitive: caseSensitive })
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-cream-200 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">
            {mode === 'regex' ? 'Regex replace' : 'Find & replace'}
          </p>
          <div className="mt-1 flex items-center gap-2">
  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
  <p className="truncate font-mono text-[13px] font-medium text-ink-800">
    {column ?? 'All columns'}
  </p>
  {!column && (
    <span className="shrink-0 rounded bg-cream-100 px-1.5 py-0.5 text-[10px] text-ink-500">
      all text columns
    </span>
  )}
</div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-ink-500">
              {mode === 'regex' ? 'Pattern' : 'Find'}
            </label>
            <input
              autoFocus
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder={mode === 'regex' ? 'e.g. \\d{4}' : 'text to find'}
              className="w-full rounded-lg border border-cream-200 bg-white px-3 py-2 font-mono text-[12.5px] text-ink-900 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-ink-500">
              Replace with
            </label>
            <input
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="(empty to delete)"
              className="w-full rounded-lg border border-cream-200 bg-white px-3 py-2 font-mono text-[12.5px] text-ink-900 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>

          <label className="flex items-center gap-2 text-[12px] text-ink-600">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-cream-300 text-accent"
            />
            Case sensitive
          </label>

          {mode === 'regex' && (
            <p className="rounded-md bg-cream-50 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
              Uses Python regex syntax. Special chars: <code className="rounded bg-white px-1 font-mono">.</code>,{' '}
              <code className="rounded bg-white px-1 font-mono">\d</code>,{' '}
              <code className="rounded bg-white px-1 font-mono">\w</code>,{' '}
              <code className="rounded bg-white px-1 font-mono">^</code>,{' '}
              <code className="rounded bg-white px-1 font-mono">$</code>,{' '}
              <code className="rounded bg-white px-1 font-mono">+</code>,{' '}
              <code className="rounded bg-white px-1 font-mono">*</code>
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-cream-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-ink-500 transition-colors hover:bg-cream-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!canApply}
            className="rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-medium text-white shadow-sm transition-colors hover:opacity-90 disabled:opacity-40"
          >
            {busy ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}