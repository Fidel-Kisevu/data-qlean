import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { CellFlag } from '../../api/client'
import { severityCellClass } from './workbench-utils'
import { ColumnMenu } from './ColumnMenu'
import { ReplaceDialog } from './ReplaceDialog'

export type WorkbenchTableProps = {
  columns: string[]
  rows: Record<string, unknown>[]
  visibleRows: Record<string, unknown>[]
  flagMap: Map<string, CellFlag>
  highlightedColumns: string[]
  showOnlyFlagged: boolean
  editColumn: string | null
  editValue: string
  cellEdit: { row: number; col: string; value: string } | null
  onStartEditColumn: (col: string) => void
  onEditValueChange: (value: string) => void
  onCommitRename: (from: string, to: string) => void
  onCancelRename: () => void
  onDropColumn: (column: string) => void
  onStartCellEdit: (rowIndex: number, column: string, value: string) => void
  onCellEditChange: (value: string) => void
  onCommitCellEdit: (rowIndex: number, column: string, value: string) => void
  onCancelCellEdit: () => void
  onColumnAction: (
    column: string,
    action: string,
    params?: Record<string, unknown>
  ) => void
  busy: boolean
}

export function WorkbenchTable({
  columns,
  rows,
  visibleRows,
  flagMap,
  highlightedColumns,
  showOnlyFlagged,
  editColumn,
  editValue,
  cellEdit,
  onStartEditColumn,
  onEditValueChange,
  onCommitRename,
  onCancelRename,
  onDropColumn,
  onStartCellEdit,
  onCellEditChange,
  onCommitCellEdit,
  onCancelCellEdit,
  onColumnAction,
  busy,
}: WorkbenchTableProps) {
  void showOnlyFlagged

  const [menu, setMenu] = useState<{
    column: string
    x: number
    y: number
  } | null>(null)

  const [dialog, setDialog] = useState<{
    action: 'replace_value' | 'regex_replace'
    column: string
  } | null>(null)

  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [selectedCell, setSelectedCell] = useState<{
    row: number
    col: number
  } | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  // Listen for Ctrl+F from App.tsx
  useEffect(() => {
    const onFocusSearch = () => {
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    window.addEventListener('dq:focus-search', onFocusSearch)
    return () => window.removeEventListener('dq:focus-search', onFocusSearch)
  }, [])

  // Filtered rows: global search + per-column filters
  const filteredRows = useMemo(() => {
    return visibleRows.filter((row) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const matches = Object.values(row).some((v) =>
          String(v ?? '').toLowerCase().includes(q)
        )
        if (!matches) return false
      }
      for (const [col, filterVal] of Object.entries(columnFilters)) {
        if (!filterVal.trim()) continue
        const cell = String(row[col] ?? '').toLowerCase()
        if (!cell.includes(filterVal.toLowerCase())) return false
      }
      return true
    })
  }, [visibleRows, search, columnFilters])

  const hasActiveFilter =
    search.trim().length > 0 ||
    Object.values(columnFilters).some((v) => v.trim().length > 0)

  const clearFilters = () => {
    setSearch('')
    setColumnFilters({})
  }

  // ── Virtualizer ──
  // Only the visible rows (+ overscan) are mounted in the DOM.
  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
    overscan: 10,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0

  // Keyboard navigation on the table
  const handleTableKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return

    const { row, col } = selectedCell
    const maxRow = filteredRows.length - 1
    const maxCol = columns.length - 1

    let nextRow = row
    let nextCol = col

    if (e.key === 'ArrowUp') nextRow = Math.max(0, row - 1)
    else if (e.key === 'ArrowDown') nextRow = Math.min(maxRow, row + 1)
    else if (e.key === 'ArrowLeft') nextCol = Math.max(0, col - 1)
    else if (e.key === 'ArrowRight') nextCol = Math.min(maxCol, col + 1)
    else if (e.key === 'Enter') {
      const actualRowIndex = rows.indexOf(filteredRows[row])
      const value = filteredRows[row]?.[columns[col]]
      onStartCellEdit(
        actualRowIndex,
        columns[col],
        value == null ? '' : String(value)
      )
      e.preventDefault()
      return
    } else {
      return
    }

    e.preventDefault()
    setSelectedCell({ row: nextRow, col: nextCol })
  }

  return (
    <div className="flex h-full flex-col">
      {/* ---------- Toolbar: search + filters ---------- */}
      <div className="flex shrink-0 items-center gap-2 border-b border-cream-200 bg-white px-4 py-2">
        <div className="relative max-w-sm flex-1">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all columns…  (Ctrl+F)"
            className="w-full rounded-lg border border-cream-200 bg-cream-50/60 py-1.5 pl-8 pr-3 text-[12.5px] text-ink-800 outline-none transition-colors placeholder:text-ink-400 focus:border-accent/50 focus:bg-white focus:ring-2 focus:ring-accent/15"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
            showFilters || hasActiveFilter
              ? 'border-accent/40 bg-accent-soft text-accent'
              : 'border-cream-200 bg-white text-ink-500 hover:border-cream-300 hover:text-ink-700'
          }`}
        >
          Column filters
          {Object.values(columnFilters).filter((v) => v.trim()).length > 0 && (
            <span className="ml-1.5 rounded bg-white px-1.5 py-0.5 font-mono text-[10px]">
              {Object.values(columnFilters).filter((v) => v.trim()).length}
            </span>
          )}
        </button>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[12px] text-ink-400 transition-colors hover:text-rose-600"
          >
            Clear
          </button>
        )}

        <span className="ml-auto font-mono text-[11px] tabular-nums text-ink-400">
          {filteredRows.length} of {visibleRows.length}
        </span>
      </div>

      {/* ---------- Table (scroll container with virtualizer) ---------- */}
      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        <table
          tabIndex={0}
          onKeyDown={handleTableKeyDown}
          className="min-w-full border-collapse text-[12.5px] outline-none"
        >
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
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setMenu({ column: col, x: e.clientX, y: e.clientY })
                    }}
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
                          onChange={(event) =>
                            onEditValueChange(event.target.value)
                          }
                          onBlur={() => {
                            if (editValue && editValue !== col) {
                              onCommitRename(col, editValue)
                            }
                            onCancelRename()
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              if (editValue && editValue !== col) {
                                onCommitRename(col, editValue)
                              }
                              onCancelRename()
                            }
                            if (event.key === 'Escape') onCancelRename()
                          }}
                          className="w-full rounded-md border border-cream-300 bg-white px-2 py-1 font-mono text-[12px] text-ink-900 outline-none ring-accent/30 focus:border-accent focus:ring-2"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartEditColumn(col)}
                          title="Click to rename · right-click for actions"
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

            {showFilters && (
              <tr>
                <th className="border-b border-cream-200 bg-cream-50 px-3 py-1.5" />
                {columns.map((col) => (
                  <th
                    key={col}
                    className="border-b border-cream-200 bg-cream-50 px-3 py-1.5"
                  >
                    <input
                      type="text"
                      value={columnFilters[col] ?? ''}
                      onChange={(e) =>
                        setColumnFilters((prev) => ({
                          ...prev,
                          [col]: e.target.value,
                        }))
                      }
                      placeholder="filter…"
                      className="w-full rounded border border-cream-200 bg-white px-2 py-0.5 text-[11px] outline-none focus:border-accent/60"
                    />
                  </th>
                ))}
              </tr>
            )}
          </thead>

          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-12 text-center text-[12px] text-ink-400"
                >
                  No rows match the current filters.
                </td>
              </tr>
            ) : (
              <>
                {/* Spacer row above — preserves scroll height for rows scrolled past */}
                {paddingTop > 0 && (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      style={{ height: paddingTop }}
                    />
                  </tr>
                )}

                {/* Only the visible rows are mounted */}
                {virtualItems.map((virtualRow) => {
                  const row = filteredRows[virtualRow.index]
                  const index = rows.indexOf(row)
                  return (
                    <tr
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      className="border-b border-cream-100 transition-colors hover:bg-cream-50/80"
                    >
                      <td className="bg-cream-50/50 px-3 py-2 text-right font-mono text-[10px] tabular-nums text-ink-400">
                        {index + 1}
                      </td>
                      {columns.map((col, colIdx) => {
                        const isHighlighted = highlightedColumns.includes(col)
                        const isEditing =
                          cellEdit?.row === index && cellEdit?.col === col
                        const isSelected =
                          selectedCell?.row === virtualRow.index &&
                          selectedCell?.col === colIdx
                        const value = row[col]
                        const flag = flagMap.get(`${index}|${col}`)
                        const isFlagged = !!flag

                        const baseClass =
                          'max-w-[280px] truncate px-3 py-2 align-top transition-colors duration-150'

                        const stateClass = isEditing
                          ? ''
                          : isFlagged
                            ? severityCellClass(flag?.severity ?? 'low')
                            : isHighlighted
                              ? 'bg-accent-soft/50'
                              : isSelected
                                ? 'ring-2 ring-inset ring-accent/50'
                                : ''

                        return (
                          <td
                            key={col}
                            className={`${baseClass} ${stateClass}`}
                            title={flag ? flag.message : undefined}
                            onClick={() =>
                              setSelectedCell({
                                row: virtualRow.index,
                                col: colIdx,
                              })
                            }
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                value={cellEdit.value}
                                onChange={(event) =>
                                  onCellEditChange(event.target.value)
                                }
                                onBlur={() => {
                                  onCommitCellEdit(index, col, cellEdit.value)
                                  onCancelCellEdit()
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    onCommitCellEdit(
                                      index,
                                      col,
                                      cellEdit.value
                                    )
                                    onCancelCellEdit()
                                  }
                                  if (event.key === 'Escape')
                                    onCancelCellEdit()
                                }}
                                className="w-full rounded-md border border-cream-300 bg-white px-2 py-1 font-mono text-[12px] text-ink-900 outline-none ring-accent/30 focus:border-accent focus:ring-2"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onStartCellEdit(
                                    index,
                                    col,
                                    value == null ? '' : String(value)
                                  )
                                }}
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
                  )
                })}

                {/* Spacer row below — preserves scroll height for rows not yet rendered */}
                {paddingBottom > 0 && (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      style={{ height: paddingBottom }}
                    />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Column action menu ---------- */}
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

      {/* ---------- Find & replace dialog ---------- */}
      {dialog && (
        <ReplaceDialog
          column={dialog.column}
          mode={dialog.action === 'regex_replace' ? 'regex' : 'plain'}
          busy={busy}
          onClose={() => setDialog(null)}
          onApply={(params) => onColumnAction(dialog.column, dialog.action, params)}
        />
      )}
    </div>
  )
}