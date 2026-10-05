import { useMemo, useState } from 'react'
import type { CellFlag } from '../api/client'
import { WorkbenchFooter } from '../components/workbench/WorkbenchFooter'
import { WorkbenchHeader } from '../components/workbench/WorkbenchHeader'
import { WorkbenchRail } from '../components/workbench/WorkbenchRail'
import { WorkbenchTable } from '../components/workbench/WorkbenchTable'
import { groupSuggestions } from '../components/workbench/workbench-utils'
import type { Change, Profile, QualityIssue, Suggestion } from '../types'

type WorkbenchPageProps = {
  sessionId: string | null
  filename: string
  columns: string[]
  rows: Record<string, unknown>[]
  suggestions: Suggestion[]
  issues: QualityIssue[]
  profile: Profile | null
  changes: Change[]
  flags: CellFlag[]
  busy: boolean
  onApprove: (ids: string[]) => void
  onReject: (ids: string[]) => void
  onRenameColumn: (from: string, to: string) => void
  onDropColumn: (column: string) => void
  onCellEdit: (rowIndex: number, column: string, value: string) => void
  onColumnAction: (
    column: string,
    action: string,
    params?: Record<string, unknown>
  ) => void
  onExport: (format: 'csv' | 'xlsx') => void
  onClearAudit?: () => void
  onUndo?: () => void
  canUndo?: boolean
}

export function WorkbenchPage(props: WorkbenchPageProps) {
  const {
    sessionId,
    filename,
    columns,
    rows,
    suggestions,
    issues,
    profile,
    changes,
    flags,
    busy,
    onApprove,
    onReject,
    onRenameColumn,
    onDropColumn,
    onCellEdit,
    onColumnAction,
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
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(false)

  const pending = useMemo(
    () => suggestions.filter((suggestion) => suggestion.status === 'pending'),
    [suggestions]
  )
  const groups = useMemo(() => groupSuggestions(pending), [pending])

  const flagMap = useMemo(() => {
    const map = new Map<string, CellFlag>()
    for (const flag of flags) map.set(`${flag.row}|${flag.column}`, flag)
    return map
  }, [flags])

  const flaggedRows = useMemo(() => {
    const set = new Set<number>()
    for (const flag of flags) set.add(flag.row)
    return set
  }, [flags])

  const visibleRows = useMemo(
    () =>
      showOnlyFlagged
        ? rows.filter((_, index) => flaggedRows.has(index))
        : rows,
    [rows, flaggedRows, showOnlyFlagged]
  )

  const approvedCount = suggestions.filter(
    (suggestion) => suggestion.status === 'approved'
  ).length
  const rejectedCount = suggestions.filter(
    (suggestion) => suggestion.status === 'rejected'
  ).length
  const total = pending.length + approvedCount + rejectedCount
  const done = approvedCount + rejectedCount
  const progress = total > 0 ? Math.round((done / total) * 100) : 100

  const selectGroup = (group: { key: string; columns: string[] }) => {
    setActiveGroupKey(group.key === activeGroupKey ? null : group.key)
    setHighlightedColumns(group.key === activeGroupKey ? [] : group.columns)
  }

  const handleHoverColumn = (column: string | null) => {
    if (column) return setHighlightedColumns([column])
    if (!activeGroupKey) return setHighlightedColumns([])
    const group = groups.find((item) => item.key === activeGroupKey)
    setHighlightedColumns(group ? group.columns : [])
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
      <WorkbenchHeader
        filename={filename}
        progress={progress}
        pendingCount={pending.length}
        changesCount={changes.length}
        flagsCount={flags.length}
        flaggedRowsCount={flaggedRows.size}
        showOnlyFlagged={showOnlyFlagged}
        busy={busy}
        onToggleFlagged={setShowOnlyFlagged}
        onExport={onExport}
      />
      <div className="flex min-h-0 flex-1">
        <WorkbenchRail
          groups={groups}
          pendingCount={pending.length}
          changesCount={changes.length}
          activeGroupKey={activeGroupKey}
          busy={busy}
          canUndo={!!canUndo}
          issues={issues}
          profile={profile}
          onSelectGroup={selectGroup}
          onApprove={onApprove}
          onReject={onReject}
          onHoverColumn={handleHoverColumn}
          onVariantApprove={onApprove}
          onUndo={onUndo}
          onClearAudit={onClearAudit}
          changes={changes}
        />
        <div className="min-w-0 flex-1 overflow-hidden bg-white">
          <div className="h-full overflow-auto">
            <WorkbenchTable
              columns={columns}
              rows={rows}
              visibleRows={visibleRows}
              flagMap={flagMap}
              highlightedColumns={highlightedColumns}
              showOnlyFlagged={showOnlyFlagged}
              editColumn={editColumn}
              editValue={editValue}
              cellEdit={cellEdit}
              onStartEditColumn={(column) => {
                setEditColumn(column)
                setEditValue(column)
              }}
              onEditValueChange={setEditValue}
              onCommitRename={(from, to) => {
                if (to && to !== from) onRenameColumn(from, to)
              }}
              onCancelRename={() => setEditColumn(null)}
              onDropColumn={onDropColumn}
              onStartCellEdit={(rowIndex, column, value) =>
                setCellEdit({ row: rowIndex, col: column, value })
              }
              onCellEditChange={(value) =>
                setCellEdit((current) =>
                  current ? { ...current, value } : current
                )
              }
              onCommitCellEdit={(rowIndex, column, value) =>
                onCellEdit(rowIndex, column, value)
              }
              onCancelCellEdit={() => setCellEdit(null)}
              onColumnAction={onColumnAction}
              busy={busy}
            />
          </div>
        </div>
      </div>
      <WorkbenchFooter
        rowsCount={rows.length}
        columnsCount={columns.length}
        changesCount={changes.length}
        flagsCount={flags.length}
        showOnlyFlagged={showOnlyFlagged}
        visibleCount={visibleRows.length}
      />
    </div>
  )
}