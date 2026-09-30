import { useMemo, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { SectionHeader } from '../components/ui/SectionHeader'

type TransformPageProps = {
  sessionId: string | null
  columns: string[]
  busy: boolean
  renameFrom: string
  renameTo: string
  onRenameFromChange: (value: string) => void
  onRenameToChange: (value: string) => void
  onRename: () => void
  onDrop: (column: string) => void
}

export function TransformPage({
  sessionId,
  columns,
  busy,
  renameFrom,
  renameTo,
  onRenameFromChange,
  onRenameToChange,
  onRename,
  onDrop,
}: TransformPageProps) {
  const [pendingDrop, setPendingDrop] = useState<string | null>(null)

  const canRename =
    !busy &&
    renameFrom.length > 0 &&
    renameTo.trim().length > 0 &&
    renameTo.trim() !== renameFrom

  const nameConflict = useMemo(
    () => columns.includes(renameTo.trim()) && renameTo.trim() !== renameFrom,
    [columns, renameTo, renameFrom]
  )

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Transform"
        title="Manual editing"
        actions={
          <p className="text-[11px] text-zinc-500">
            Changes apply to the working copy only
          </p>
        }
      />

      {!sessionId ? (
        <Panel>
          <div className="py-8 text-center">
            <p className="text-[13px] text-zinc-400">Upload a file first.</p>
          </div>
        </Panel>
      ) : columns.length === 0 ? (
        <Panel>
          <div className="py-8 text-center">
            <p className="text-[13px] text-zinc-400">No columns to edit.</p>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* ---------- Rename column ---------- */}
          <Panel className="p-5">
            <div className="mb-4">
              <h3 className="text-[14px] font-semibold text-zinc-100">
                Rename column
              </h3>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Give a column a clearer name.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Current name
                </label>
                <select
                  value={renameFrom}
                  onChange={(e) => onRenameFromChange(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[13px] text-zinc-200 outline-none transition-colors focus:border-zinc-600"
                >
                  <option value="">Select a column…</option>
                  {columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  New name
                </label>
                <input
                  value={renameTo}
                  onChange={(e) => onRenameToChange(e.target.value)}
                  placeholder="e.g. customer_id"
                  className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-[13px] text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 ${
                    nameConflict
                      ? 'border-rose-500/50 focus:border-rose-500'
                      : 'border-zinc-800 focus:border-zinc-600'
                  }`}
                />
                {nameConflict && (
                  <p className="mt-1.5 text-[11px] text-rose-300">
                    A column named “{renameTo.trim()}” already exists.
                  </p>
                )}
              </div>

              {/* Live preview */}
              {renameFrom && renameTo.trim() && !nameConflict && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Preview
                  </p>
                  <p className="mt-1 text-[12px] text-zinc-300">
                    <span className="font-mono text-zinc-500 line-through">
                      {renameFrom}
                    </span>{' '}
                    <span className="text-zinc-500">→</span>{' '}
                    <span className="font-mono text-emerald-300">
                      {renameTo.trim()}
                    </span>
                  </p>
                </div>
              )}

              <div className="pt-1">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!canRename}
                  onClick={onRename}
                >
                  Rename column
                </Button>
              </div>
            </div>
          </Panel>

          {/* ---------- Drop column ---------- */}
          <Panel className="p-5">
            <div className="mb-4">
              <h3 className="text-[14px] font-semibold text-zinc-100">
                Drop column
              </h3>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Remove a column from the working copy.
              </p>
            </div>

            <div className="space-y-2">
              {columns.map((column) => {
                const isPending = pendingDrop === column
                return (
                  <div
                    key={column}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-zinc-300">
                      {column}
                    </span>

                    {isPending ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            onDrop(column)
                            setPendingDrop(null)
                          }}
                          className="rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
                        >
                          Confirm drop
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDrop(null)}
                          className="rounded-md border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPendingDrop(column)}
                        className="shrink-0 rounded-md border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-rose-500/40 hover:text-rose-300 disabled:opacity-50"
                      >
                        Drop
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {pendingDrop && (
              <p className="mt-3 text-[11px] text-amber-300">
                Removing “{pendingDrop}” cannot be undone in v1.
              </p>
            )}
          </Panel>
        </div>
      )}
    </section>
  )
}