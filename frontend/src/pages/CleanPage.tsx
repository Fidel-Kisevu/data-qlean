import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Button } from '../components/ui/Button'
import { ColumnMenu } from '../components/workbench/ColumnMenu'
import { ReplaceDialog } from '../components/workbench/ReplaceDialog'
import type { Change, Suggestion } from '../types'

type CleanPageProps = {
  sessionId: string | null
  filename: string
  columns: string[]
  rows: Record<string, unknown>[]
  changes: Change[]
  suggestions: Suggestion[]
  busy: boolean
  onReorderColumns: (order: string[]) => void
  onSort: (column: string, ascending: boolean) => void
  onRenameColumn: (from: string, to: string) => void
  onDropColumn: (column: string) => void
  onCellEdit: (rowIndex: number, column: string, value: string) => void
  onColumnAction: (column: string, action: string, params?: Record<string, unknown>) => void
  onExport: (format: 'csv' | 'xlsx') => void
  onDeleteRows: (indices: number[]) => void
}

export function CleanPage(props: CleanPageProps) {
  const {
    sessionId,
    filename,
    columns,
    rows,
    changes,
    busy,
    onReorderColumns,
    onSort,
    onRenameColumn,
    onDropColumn,
    onCellEdit,
    onColumnAction,
    onExport,
    onDeleteRows,
  } = props

  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [dragColumn, setDragColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortAscending, setSortAscending] = useState(true)
  const [editColumn, setEditColumn] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [cellEdit, setCellEdit] = useState<{ row: number; col: string; value: string } | null>(null)
  const [menu, setMenu] = useState<{ column: string; x: number; y: number } | null>(null)
  const [dialog, setDialog] = useState<{
    action: 'replace_value' | 'regex_replace'
    column: string
  } | null>(null)

  // ---- Virtualizer: scroll container ref ----
  const tableScrollRef = useRef<HTMLDivElement>(null)

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenColumns.has(c)),
    [columns, hiddenColumns]
  )

  // ---- Virtualizer: only visible rows are mounted ----
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => 34,
    overscan: 10,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0

  const toggleColumn = (col: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      return next
    })
  }

  const toggleRow = (i: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const clearSelection = () => {
    setSelectedColumns(new Set())
    setSelectedRows(new Set())
  }

  // ---- Column drag ----
  const handleColumnDragStart = (col: string) => setDragColumn(col)

  const handleColumnDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault()
    if (dragColumn && dragColumn !== col) setDragOverColumn(col)
  }

  const handleColumnDrop = (targetCol: string) => {
    if (!dragColumn || dragColumn === targetCol) {
      setDragColumn(null)
      setDragOverColumn(null)
      return
    }
    const newOrder = [...columns]
    const fromIdx = newOrder.indexOf(dragColumn)
    const toIdx = newOrder.indexOf(targetCol)
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, dragColumn)
    onReorderColumns(newOrder)
    setDragColumn(null)
    setDragOverColumn(null)
  }

  // ---- Bulk actions ----
  const dropSelectedColumns = () => {
    if (selectedColumns.size === 0) return
    const names = Array.from(selectedColumns)
    if (!confirm(`Drop ${names.length} column${names.length === 1 ? '' : 's'}? This cannot be undone (use Undo to restore).`)) return
    names.forEach((col) => onDropColumn(col))
    clearSelection()
  }

  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) return
    const idx = Array.from(selectedRows).sort((a, b) => b - a)
    if (!confirm(`Delete ${idx.length} row${idx.length === 1 ? '' : 's'}?`)) return
    onDeleteRows(idx)
    clearSelection()
  }

  const handleSortClick = (col: string) => {
    if (sortColumn === col) {
      const next = !sortAscending
      setSortAscending(next)
      onSort(col, next)
    } else {
      setSortColumn(col)
      setSortAscending(true)
      onSort(col, true)
    }
  }

  if (!sessionId) {
    return (
      <div className="grid h-full place-items-center bg-cream-50">
        <div className="max-w-xs rounded-2xl border border-cream-200 bg-white px-8 py-10 text-center shadow-sm">
          <p className="text-[15px] font-medium text-ink-800">No file loaded</p>
          <p className="mt-1.5 text-[13px] text-ink-500">Upload a file first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-cream-50">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-cream-200 bg-white px-6 py-3.5">
        <div className="flex min-w-0 items-center gap-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">
              Arranging
            </p>
            <p className="mt-0.5 truncate font-mono text-[13px] font-medium text-ink-800">
              {filename || 'Untitled'}
            </p>
          </div>

          <div className="hidden h-9 w-px bg-cream-200 sm:block" />

          <div className="hidden items-center gap-3 text-[12px] text-ink-500 sm:flex">
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
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {(selectedColumns.size > 0 || selectedRows.size > 0) && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] text-amber-800">
              <span>
                {selectedColumns.size > 0 && `${selectedColumns.size} col${selectedColumns.size === 1 ? '' : 's'}`}
                {selectedColumns.size > 0 && selectedRows.size > 0 && ' · '}
                {selectedRows.size > 0 && `${selectedRows.size} row${selectedRows.size === 1 ? '' : 's'}`}
              </span>
              {selectedColumns.size > 0 && (
                <button onClick={dropSelectedColumns} disabled={busy} className="font-medium text-amber-700 hover:text-amber-900">
                  Drop
                </button>
              )}
              {selectedRows.size > 0 && (
                <button onClick={deleteSelectedRows} disabled={busy} className="font-medium text-amber-700 hover:text-amber-900">
                  Delete
                </button>
              )}
              <button onClick={clearSelection} className="text-amber-600 hover:text-amber-800">
                ✕
              </button>
            </div>
          )}

          <Button variant="secondary" onClick={() => onExport('csv')} disabled={busy}>
            Export CSV
          </Button>
          <Button variant="primary" onClick={() => onExport('xlsx')} disabled={busy}>
            Export Excel
          </Button>
        </div>
      </header>

      {/* Hidden columns bar */}
      {hiddenColumns.size > 0 && (
        <div className="flex shrink-0 items-center gap-2 border-b border-cream-200 bg-cream-100/50 px-6 py-2 text-[12px]">
          <span className="text-ink-500">Hidden:</span>
          {Array.from(hiddenColumns).map((c) => (
            <button
              key={c}
              onClick={() => {
                setHiddenColumns((prev) => {
                  const next = new Set(prev)
                  next.delete(c)
                  return next
                })
              }}
              className="rounded bg-white px-2 py-0.5 font-mono text-[11px] text-ink-600 shadow-sm hover:bg-cream-50"
            >
              {c} ×
            </button>
          ))}
        </div>
      )}

      {/* Table (virtualized) */}
      <div className="min-h-0 flex-1 overflow-hidden bg-white">
        <div ref={tableScrollRef} className="h-full overflow-auto">
          <table className="min-w-full border-collapse text-[12.5px]">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="w-11 border-b border-cream-200 bg-cream-50 px-3 py-2.5 text-right text-[10px] font-semibold text-ink-400">
                  #
                </th>
                {visibleColumns.map((col) => {
                  const isSelected = selectedColumns.has(col)
                  const isDragOver = dragOverColumn === col
                  const isSort = sortColumn === col

                  return (
                    <th
                      key={col}
                      draggable={editColumn !== col}
                      onDragStart={() => handleColumnDragStart(col)}
                      onDragOver={(e) => handleColumnDragOver(e, col)}
                      onDrop={() => handleColumnDrop(col)}
                      onDragEnd={() => {
                        setDragColumn(null)
                        setDragOverColumn(null)
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setMenu({ column: col, x: e.clientX, y: e.clientY })
                      }}
                      className={`group whitespace-nowrap border-b border-cream-200 px-3 py-2.5 text-left font-medium transition-all ${
                        isDragOver ? 'bg-accent-soft' : isSelected ? 'bg-amber-50' : 'bg-cream-50 text-ink-700'
                      } ${dragColumn === col ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleColumn(col)}
                          className="h-3 w-3 rounded border-cream-300 text-accent"
                        />

                        {editColumn === col ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => {
                              if (editValue && editValue !== col) onRenameColumn(col, editValue)
                              setEditColumn(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (editValue && editValue !== col) onRenameColumn(col, editValue)
                                setEditColumn(null)
                              }
                              if (e.key === 'Escape') setEditColumn(null)
                            }}
                            className="w-full rounded-md border border-cream-300 bg-white px-2 py-0.5 font-mono text-[12px] outline-none ring-accent/30 focus:border-accent focus:ring-2"
                          />
                        ) : (
                          <button
                            type="button"
                            onDoubleClick={() => {
                              setEditColumn(col)
                              setEditValue(col)
                            }}
                            className="cursor-grab truncate font-mono text-[11.5px] transition-colors hover:text-accent active:cursor-grabbing"
                            title="Drag to reorder · double-click to rename · right-click for actions"
                          >
                            {col}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSortClick(col)}
                          title={`Sort ${isSort && sortAscending ? 'descending' : 'ascending'}`}
                          className={`rounded p-0.5 transition-colors ${
                            isSort ? 'text-accent' : 'text-ink-300 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                            {isSort && !sortAscending ? (
                              <path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                            ) : (
                              <path d="M7 14l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                            )}
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setHiddenColumns((prev) => new Set(prev).add(col))
                          }}
                          title="Hide column"
                          className="rounded p-0.5 text-ink-300 opacity-0 transition-all hover:bg-cream-100 hover:text-ink-600 group-hover:opacity-100"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" strokeWidth="2" stroke="currentColor">
                            <path d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83M9.363 5.365A9.466 9.466 0 0112 5c4 0 7.333 2.667 9 7-1.09 2.633-2.86 4.667-5 5.7M6.5 6.5C4.593 7.667 3.15 9.5 2 12c1.667 4.333 5 7 10 7 1.067 0 2.06-.133 2.982-.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDropColumn(col)}
                          title={`Drop "${col}"`}
                          className="rounded p-0.5 text-ink-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" strokeWidth="2" stroke="currentColor">
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? null : (
                <>
                  {/* Top spacer — preserves scroll height for rows above the window */}
                  {paddingTop > 0 && (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} style={{ height: paddingTop }} />
                    </tr>
                  )}

                  {/* Only the visible rows are mounted */}
                  {virtualItems.map((virtualRow) => {
                    const i = virtualRow.index
                    const row = rows[i]
                    const isRowSelected = selectedRows.has(i)
                    return (
                      <tr
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        className={`border-b border-cream-100 transition-colors ${
                          isRowSelected ? 'bg-amber-50' : 'hover:bg-cream-50/80'
                        }`}
                      >
                        <td className="bg-cream-50/50 px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => toggleRow(i)}
                              className="h-3 w-3 rounded border-cream-300 text-accent"
                            />
                            <span className="font-mono text-[10px] tabular-nums text-ink-400">{i + 1}</span>
                          </div>
                        </td>
                        {visibleColumns.map((col) => {
                          const isEditing = cellEdit?.row === i && cellEdit?.col === col
                          const value = row[col]
                          return (
                            <td key={col} className="max-w-[280px] truncate px-3 py-2 align-top">
                              {isEditing ? (
                                <input
                                  autoFocus
                                  value={cellEdit.value}
                                  onChange={(e) => setCellEdit({ ...cellEdit, value: e.target.value })}
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
                                  className="w-full rounded-md border border-cream-300 bg-white px-2 py-1 font-mono text-[12px] outline-none ring-accent/30 focus:border-accent focus:ring-2"
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
                                    <span className="font-mono text-[10px] italic text-ink-400">null</span>
                                  ) : (
                                    String(value)
                                  )}
                                </button>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}

                  {/* Bottom spacer — preserves scroll height for rows below the window */}
                  {paddingBottom > 0 && (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} style={{ height: paddingBottom }} />
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-cream-200 bg-white px-6 py-2.5 text-[12px] text-ink-500">
        <span>
          Drag a column header to reorder · double-click to rename · right-click for actions
        </span>
        <span>
          <span className="font-mono font-medium tabular-nums text-ink-800">{changes.length}</span> changes applied
        </span>
      </footer>

      {menu && (
        <ColumnMenu
          column={menu.column}
          x={menu.x}
          y={menu.y}
          busy={busy}
          onClose={() => setMenu(null)}
          onAction={(action, params) => {
            onColumnAction(menu.column, action, params)
            setMenu(null)
          }}
          onOpenDialog={(action) => {
            setDialog({ action, column: menu.column })
            setMenu(null)
          }}
        />
      )}

      {dialog && (
        <ReplaceDialog
          column={dialog.column}
          mode={dialog.action === 'regex_replace' ? 'regex' : 'plain'}
          busy={busy}
          onClose={() => setDialog(null)}
          onApply={(params) =>
            onColumnAction(dialog.column, dialog.action, params)
          }
        />
      )}
    </div>
  )
}