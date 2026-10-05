import { Button } from '../ui/Button'

export type WorkbenchHeaderProps = {
  filename: string
  progress: number
  pendingCount: number
  changesCount: number
  flagsCount: number
  flaggedRowsCount: number
  showOnlyFlagged: boolean
  busy: boolean
  onToggleFlagged: (checked: boolean) => void
  onExport: (format: 'csv' | 'xlsx') => void
}

export function WorkbenchHeader({
  filename,
  progress,
  pendingCount,
  changesCount,
  flagsCount,
  flaggedRowsCount,
  showOnlyFlagged,
  busy,
  onToggleFlagged,
  onExport,
}: WorkbenchHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-6 border-b bg-white px-6 py-3.5">
      <div className="flex min-w-0 items-center gap-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">
            Working on
          </p>
          <p className="mt-0.5 truncate font-mono text-[13px] font-medium text-ink-800">
            {filename || 'Untitled'}
          </p>
        </div>

        <div className="hidden h-9 w-px bg-cream-200 sm:block" />

        <div className="hidden sm:block">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">
            Progress
          </p>
          <div className="mt-1.5 flex items-center gap-2.5">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-cream-200">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-mono text-[12px] tabular-nums text-ink-600">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <label className="hidden items-center gap-2 rounded-lg border border-cream-200 bg-cream-50/80 px-3 py-1.5 text-[12px] text-ink-500 md:flex">
          <input
            type="checkbox"
            checked={showOnlyFlagged}
            onChange={(event) => onToggleFlagged(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-cream-300 text-accent focus:ring-accent/30"
          />
          <span>Issues only</span>
          {flagsCount > 0 && (
            <span className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-rose-700">
              {flaggedRowsCount}
            </span>
          )}
        </label>

        <div className="hidden items-center gap-3 rounded-lg border border-cream-200 bg-cream-50/80 px-3.5 py-1.5 text-[12px] text-ink-500 lg:flex">
          <span>
            <span className="font-mono font-medium tabular-nums text-ink-800">
              {pendingCount}
            </span>{' '}
            pending
          </span>
          <span className="text-cream-300">·</span>
          <span>
            <span className="font-mono font-medium tabular-nums text-ink-800">
              {changesCount}
            </span>{' '}
            applied
          </span>
        </div>

        <Button variant="secondary" onClick={() => onExport('csv')} disabled={busy}>
          Export CSV
        </Button>
        <Button variant="primary" onClick={() => onExport('xlsx')} disabled={busy}>
          Export Excel
        </Button>
      </div>
    </header>
  )
}
