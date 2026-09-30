import { useMemo, useState } from 'react'
import { Button } from '../components/ui/Button'
import type { Change, QualityIssue, Suggestion } from '../types'

type WorkbenchPageProps = {
  sessionId: string | null
  filename: string
  columns: string[]
  rows: Record<string, unknown>[]
  suggestions: Suggestion[]
  issues: QualityIssue[]
  changes: Change[]
  busy: boolean
  onApprove: (ids: string[]) => void
  onReject: (ids: string[]) => void
  onRenameColumn: (from: string, to: string) => void
  onDropColumn: (column: string) => void
  onCellEdit: (rowIndex: number, column: string, value: string) => void
  onExport: (format: 'csv' | 'xlsx') => void
  onClearAudit?: () => void
  onUndo?: () => void
  canUndo?: boolean
}

type SuggestionGroup = {
  key: string
  rule_id: string
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  suggestions: Suggestion[]
  columns: string[]
}

function groupSuggestions(suggestions: Suggestion[]): SuggestionGroup[] {
  const map = new Map<string, Suggestion[]>()
  for (const s of suggestions) {
    const key = s.rule_id ?? s.title
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return Array.from(map.entries())
    .map(([key, group]) => {
      const first = group[0]
      return {
        key,
        rule_id: key,
        severity: first.severity,
        title: simplifyTitle(first.title, group.length),
        description: first.description.split(' Column ')[0],
        suggestions: group,
        columns: group.map((s) => s.column).filter((c): c is string => !!c),
      }
    })
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
}

const severityRank = (s: string) =>
  s === 'high' ? 0 : s === 'medium' ? 1 : 2

function simplifyTitle(title: string, count: number): string {
  if (count === 1) return title
  return title.replace(/['"][^'"]+['"]/, '').replace(/\s+/g, ' ').trim()
}

export function WorkbenchPage(props: WorkbenchPageProps) {
  const {
    sessionId,
    filename,
    columns,
    rows,
    suggestions,
    changes,
    busy,
    onApprove,
    onReject,
    onRenameColumn,
    onDropColumn,
    onCellEdit,
    onExport,
    onClearAudit,
    onUndo,
    canUndo,
  } = props

  const [highlightedColumns, setHighlightedColumns] = useState<string[]>([])
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null)
  const [editColumn, setEditColumn] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [cellEdit, setCellEdit] = useState<{
    row: number
    col: string
    value: string
  } | null>(null)

  const pending = useMemo(
    () => suggestions.filter((s) => s.status === 'pending'),
    [suggestions]
  )

  const groups = useMemo(() => groupSuggestions(pending), [pending])

  const approvedCount = suggestions.filter((s) => s.status === 'approved').length
  const rejectedCount = suggestions.filter((s) => s.status === 'rejected').length
  const total = pending.length + approvedCount + rejectedCount
  const done = approvedCount + rejectedCount
  const progress = total > 0 ? Math.round((done / total) * 100) : 100

  const selectGroup = (g: SuggestionGroup) => {
    setActiveGroupKey(g.key === activeGroupKey ? null : g.key)
    setHighlightedColumns(g.key === activeGroupKey ? [] : g.columns)
  }

  if (!sessionId) {
    return (
      <div className="grid h-full place-items-center bg-cream-50">
        <div className="max-w-xs rounded-2xl border border-cream-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-cream-100">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-ink-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-[15px] font-medium text-ink-800">No file loaded</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
            Upload a CSV or Excel file to start cleaning and reviewing suggestions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-cream-50">
      {/* ---------- Top bar ---------- */}
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-cream-200 bg-white px-6 py-3.5">
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
          <div className="hidden items-center gap-3 rounded-lg border border-cream-200 bg-cream-50/80 px-3.5 py-1.5 text-[12px] text-ink-500 md:flex">
            <span>
              <span className="font-mono font-medium tabular-nums text-ink-800">
                {pending.length}
              </span>{' '}
              pending
            </span>
            <span className="text-cream-300">·</span>
            <span>
              <span className="font-mono font-medium tabular-nums text-ink-800">
                {changes.length}
              </span>{' '}
              applied
            </span>
          </div>

          <Button
            variant="secondary"
            onClick={() => onExport('csv')}
            disabled={busy}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            onClick={() => onExport('xlsx')}
            disabled={busy}
          >
            Export Excel
          </Button>
        </div>
      </header>

      {/* ---------- Body ---------- */}
      <div className="flex min-h-0 flex-1">
        {/* Left rail */}
        <aside className="flex w-[340px] shrink-0 flex-col border-r border-cream-200 bg-white">
          <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                Suggestions
              </p>
              <p className="mt-0.5 text-[12px] text-ink-400">
                {groups.length === 0
                  ? 'All caught up'
                  : groups.length === 1
                    ? `1 group · ${pending.length} item${pending.length === 1 ? '' : 's'}`
                    : `${groups.length} groups · ${pending.length} item${pending.length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Pending groups */}
            <div className="space-y-2.5 bg-cream-50/60 p-3">
              {groups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-cream-300 bg-white px-4 py-10 text-center">
                  <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-emerald-50">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5 stroke-emerald-600"
                      fill="none"
                      strokeWidth="2.25"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="text-[13px] font-medium text-ink-800">
                    Nothing to fix
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-500">
                    {changes.length > 0
                      ? `${changes.length} change${changes.length === 1 ? '' : 's'} applied below.`
                      : 'Upload a file to begin.'}
                  </p>
                </div>
              ) : (
                groups.map((g) => (
                  <GroupCard
                    key={g.key}
                    group={g}
                    active={activeGroupKey === g.key}
                    busy={busy}
                    onSelect={() => selectGroup(g)}
                    onApprove={() => onApprove(g.suggestions.map((s) => s.id))}
                    onReject={() => onReject(g.suggestions.map((s) => s.id))}
                    onHoverColumn={(col) =>
                      setHighlightedColumns(col ? [col] : g.columns)
                    }
                  />
                ))
              )}
            </div>

            {/* Audit trail */}
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
                  {[...changes].reverse().map((c) => (
                    <ChangeRow key={c.id} change={c} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Table */}
        <div className="min-w-0 flex-1 overflow-hidden bg-white">
          <div className="h-full overflow-auto">
            <table className="min-w-full border-collapse text-[12.5px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-11 border-b border-cream-200 bg-cream-50 px-3 py-2.5 text-right text-[10px] font-semibold text-ink-400">
                    #
                  </th>
                  {columns.map((col) => {
                    const isHighlighted = highlightedColumns.includes(col)
                    return (
                      <th
                        key={col}
                        className={`group whitespace-nowrap border-b border-cream-200 px-3 py-2.5 text-left font-medium transition-colors duration-150 ${
                          isHighlighted
                            ? 'bg-accent-soft text-accent'
                            : 'bg-cream-50 text-ink-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {editColumn === col ? (
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => {
                                if (editValue && editValue !== col) {
                                  onRenameColumn(col, editValue)
                                }
                                setEditColumn(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (editValue && editValue !== col) {
                                    onRenameColumn(col, editValue)
                                  }
                                  setEditColumn(null)
                                }
                                if (e.key === 'Escape') setEditColumn(null)
                              }}
                              className="w-full rounded-md border border-cream-300 bg-white px-2 py-1 font-mono text-[12px] text-ink-900 outline-none ring-accent/30 focus:border-accent focus:ring-2"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditColumn(col)
                                setEditValue(col)
                              }}
                              title="Click to rename"
                              className="truncate font-mono text-[11.5px] transition-colors hover:text-accent"
                            >
                              {col}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onDropColumn(col)}
                            title={`Drop "${col}"`}
                            className="rounded p-0.5 text-ink-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5"
                              fill="none"
                              strokeWidth="2"
                              stroke="currentColor"
                            >
                              <path
                                d="M6 18L18 6M6 6l12 12"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-cream-100 transition-colors hover:bg-cream-50/80"
                  >
                    <td className="bg-cream-50/50 px-3 py-2 text-right font-mono text-[10px] tabular-nums text-ink-400">
                      {i + 1}
                    </td>
                    {columns.map((col) => {
                      const isHighlighted = highlightedColumns.includes(col)
                      const isEditing =
                        cellEdit?.row === i && cellEdit?.col === col
                      const value = row[col]

                      return (
                        <td
                          key={col}
                          className={`max-w-[280px] truncate px-3 py-2 align-top transition-colors duration-150 ${
                            isHighlighted ? 'bg-accent-soft/50' : ''
                          }`}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              value={cellEdit.value}
                              onChange={(e) =>
                                setCellEdit({
                                  ...cellEdit,
                                  value: e.target.value,
                                })
                              }
                              onBlur={() => {
                                onCellEdit(i, col, cellEdit.value)
                                setCellEdit(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  onCellEdit(i, col, cellEdit.value)
                                  setCellEdit(null)
                                }
                                if (e.key === 'Escape') setCellEdit(null)
                              }}
                              className="w-full rounded-md border border-cream-300 bg-white px-2 py-1 font-mono text-[12px] text-ink-900 outline-none ring-accent/30 focus:border-accent focus:ring-2"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setCellEdit({
                                  row: i,
                                  col,
                                  value: value == null ? '' : String(value),
                                })
                              }
                              className="w-full truncate rounded px-0.5 text-left text-ink-700 transition-colors hover:text-ink-900"
                              title={value == null ? '' : String(value)}
                            >
                              {value == null ? (
                                <span className="font-mono text-[10px] italic text-ink-400">
                                  null
                                </span>
                              ) : (
                                String(value)
                              )}
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---------- Footer ---------- */}
      <footer className="flex shrink-0 items-center justify-between border-t border-cream-200 bg-white px-6 py-2.5">
        <div className="flex items-center gap-3 text-[12px] text-ink-500">
          <span>
            <span className="font-mono font-medium tabular-nums text-ink-800">
              {rows.length}
            </span>{' '}
            rows
          </span>
          <span className="text-cream-300">·</span>
          <span>
            <span className="font-mono font-medium tabular-nums text-ink-800">
              {columns.length}
            </span>{' '}
            columns
          </span>
          <span className="text-cream-300">·</span>
          <span>
            <span className="font-mono font-medium tabular-nums text-ink-800">
              {changes.length}
            </span>{' '}
            changes applied
          </span>
        </div>
        <p className="hidden text-[12px] text-ink-400 sm:block">
          Click any cell to edit · click a column name to rename
        </p>
      </footer>
    </div>
  )
}

/* ---------- Group card ---------- */

function GroupCard({
  group,
  active,
  busy,
  onSelect,
  onApprove,
  onReject,
  onHoverColumn,
}: {
  group: SuggestionGroup
  active: boolean
  busy: boolean
  onSelect: () => void
  onApprove: () => void
  onReject: () => void
  onHoverColumn: (col: string | null) => void
}) {
  const count = group.suggestions.length

  const rail = {
    high: 'bg-rose-500',
    medium: 'bg-amber-500',
    low: 'bg-emerald-500',
  }[group.severity]

  const badge = {
    high: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80',
    medium: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80',
    low: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80',
  }[group.severity]

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-150 ${
        active
          ? 'border-accent shadow-md ring-1 ring-accent/20'
          : 'border-cream-200 hover:border-cream-300 hover:shadow'
      }`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${rail}`} />

      <div className="p-3.5 pl-4">
        <button
          type="button"
          onClick={onSelect}
          onMouseEnter={() => onHoverColumn(null)}
          onMouseLeave={() => onHoverColumn(null)}
          className="w-full text-left"
        >
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge}`}
            >
              {group.severity}
            </span>
            {count > 1 && (
              <span className="text-[11px] text-ink-400">
                {count} {group.columns.length ? 'columns' : 'items'}
              </span>
            )}
          </div>

          <p className="mt-2 text-[13.5px] font-semibold leading-snug text-ink-900">
            {group.title}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-500">
            {group.description}
          </p>
        </button>

        {group.columns.length > 1 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {group.columns.slice(0, 4).map((col) => (
              <button
                key={col}
                type="button"
                onMouseEnter={() => onHoverColumn(col)}
                onMouseLeave={() => onHoverColumn(null)}
                className="truncate rounded-md bg-cream-100 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-500 transition-colors hover:bg-cream-200 hover:text-ink-800"
              >
                {col}
              </button>
            ))}
            {group.columns.length > 4 && (
              <span className="rounded-md bg-cream-100 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-400">
                +{group.columns.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="flex-1 rounded-lg bg-accent px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          >
            Approve{count > 1 ? ` all ${count}` : ''}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="rounded-lg border border-cream-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink-500 transition-colors hover:border-cream-300 hover:bg-cream-50 hover:text-ink-700 disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Change row ---------- */

function ChangeRow({ change }: { change: Change }) {
  const tone =
    change.action === 'approve_suggestion'
      ? {
          rail: 'bg-emerald-500',
          chip: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70',
          label: 'Approved',
        }
      : change.action === 'reject_suggestion'
        ? {
            rail: 'bg-rose-500',
            chip: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70',
            label: 'Rejected',
          }
        : change.action === 'drop_column'
          ? {
              rail: 'bg-rose-500',
              chip: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70',
              label: 'Dropped',
            }
          : change.action === 'rename_column'
            ? {
                rail: 'bg-sky-500',
                chip: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/70',
                label: 'Renamed',
              }
            : {
                rail: 'bg-amber-500',
                chip: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/70',
                label: 'Edited',
              }

  const time = new Date(change.applied_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="relative overflow-hidden rounded-lg border border-cream-200 bg-cream-50/80 pl-3 transition-colors hover:bg-cream-50">
      <div className={`absolute left-0 top-0 h-full w-0.5 ${tone.rail}`} />

      <div className="px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tone.chip}`}
          >
            {tone.label}
          </span>
          <span className="font-mono text-[10px] tabular-nums text-ink-400">
            {time}
          </span>
        </div>

        <p className="mt-1.5 text-[12px] leading-snug text-ink-700">
          {change.description}
        </p>

        {change.column && (
          <p className="mt-0.5 truncate font-mono text-[10.5px] text-ink-400">
            {change.column}
          </p>
        )}

        {change.before && change.after && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px]">
            <span className="truncate font-mono text-ink-400 line-through">
              {change.before.sample.join(', ')}
            </span>
            <span className="shrink-0 text-ink-300">→</span>
            <span className="truncate font-mono text-emerald-700">
              {change.after.sample.join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}