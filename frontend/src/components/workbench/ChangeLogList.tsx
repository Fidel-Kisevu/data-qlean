import { ChangeLogItem } from './ChangeLogItem'
import type { Change } from '../../types'

export type ChangeLogListProps = {
  changes: Change[]
  canUndo: boolean
  busy: boolean
  onUndo?: () => void
  onClearAudit?: () => void
}

export function ChangeLogList({
  changes,
  canUndo,
  busy,
  onUndo,
  onClearAudit,
}: ChangeLogListProps) {
  return (
    <div className="border-t border-cream-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
          Actions done
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tabular-nums text-ink-400">
            {changes.length}
          </span>
          {canUndo && onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={busy}
              title="Undo the most recent change"
              className="rounded-md border border-cream-200 bg-white px-2 py-0.5 text-[11px] font-medium text-ink-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
            >
              ↶ Undo
            </button>
          )}
          {changes.length > 0 && onClearAudit && (
            <button
              type="button"
              onClick={onClearAudit}
              title="Clear audit log"
              className="text-[11px] text-ink-400 transition-colors hover:text-rose-500"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {changes.length === 0 ? (
        <div className="px-4 pb-5 text-[12px] leading-relaxed text-ink-400">
          Nothing yet. Approve, reject, or edit to start the audit trail.
        </div>
      ) : (
        <div className="space-y-2 px-3 pb-4">
          {[...changes].reverse().map((change) => (
            <ChangeLogItem key={change.id} change={change} />
          ))}
        </div>
      )}
    </div>
  )
}
