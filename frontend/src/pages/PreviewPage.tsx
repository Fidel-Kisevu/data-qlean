import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

type PreviewRow = Record<string, unknown>

type PreviewPageProps = {
  sessionId: string | null
  filename: string
  originalFilename: string | null
  fileSizeBytes: number | null
  columns: string[]
  rows: PreviewRow[]
  totalRows: number
  loading: boolean
  onBack: () => void
}

export function PreviewPage({
  sessionId,
  filename,
  originalFilename,
  fileSizeBytes,
  columns,
  rows,
  totalRows,
  loading,
  onBack,
}: PreviewPageProps) {
  const [search, setSearch] = useState('')

  // ---- Virtualizer: scroll container ref ----
  const tableScrollRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
    )
  }, [rows, search])

  // ---- Virtualizer: only visible rows are mounted ----
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
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

  if (!sessionId) {
    return (
      <div className="grid h-full place-items-center bg-cream-50">
        <div className="max-w-xs rounded-2xl border border-cream-200 bg-white px-8 py-10 text-center shadow-sm">
          <p className="text-[15px] font-medium text-ink-800">No file loaded</p>
          <p className="mt-1.5 text-[13px] text-ink-500">
            Upload a file first to preview it here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-cream-50">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-cream-200 bg-white px-6 py-3.5">
        <div className="flex min-w-0 items-center gap-5">
          <button
            type="button"
            onClick={onBack}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cream-200 bg-white text-ink-500 transition-colors hover:bg-cream-50 hover:text-ink-700"
            title="Back to Workbench"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">
              Original upload · read-only
            </p>
            <p className="mt-0.5 truncate font-mono text-[13px] font-medium text-ink-800">
              {originalFilename || filename || 'Untitled'}
            </p>
          </div>

          <div className="hidden h-9 w-px bg-cream-200 sm:block" />

          <div className="hidden items-center gap-3 text-[12px] text-ink-500 sm:flex">
            <span>
              <span className="font-mono font-medium tabular-nums text-ink-800">
                {totalRows}
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
            {fileSizeBytes != null && (
              <>
                <span className="text-cream-300">·</span>
                <span>{formatBytes(fileSizeBytes)}</span>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="relative">
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
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search original data…"
              className="w-[220px] rounded-lg border border-cream-200 bg-cream-50/80 py-1.5 pl-8 pr-3 text-[12.5px] text-ink-800 outline-none transition-colors placeholder:text-ink-400 focus:border-accent/50 focus:bg-white focus:ring-2 focus:ring-accent/15"
            />
          </div>
        </div>
      </header>

      {/* Read-only banner */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-amber-200/60 bg-amber-50/60 px-6 py-2 text-[12px] text-amber-800">
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M12 9v4m0 4h.01M12 3l9 18H3l9-18z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>
          This is the original file exactly as uploaded. Nothing here is editable
          and no cleaning has been applied.
        </span>
      </div>

      {/* Table (virtualized) */}
      <div className="min-h-0 flex-1 overflow-hidden bg-white">
        <div ref={tableScrollRef} className="h-full overflow-auto">
          {loading ? (
            <div className="grid h-full place-items-center">
              <p className="text-[13px] text-ink-500">Loading original file…</p>
            </div>
          ) : columns.length === 0 ? (
            <div className="grid h-full place-items-center">
              <p className="text-[13px] text-ink-500">Original file is empty.</p>
            </div>
          ) : (
            <table className="min-w-full border-collapse text-[12.5px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-11 border-b border-cream-200 bg-cream-100 px-3 py-2.5 text-right text-[10px] font-semibold text-ink-500">
                    #
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap border-b border-cream-200 bg-cream-100 px-3 py-2.5 text-left font-medium text-ink-700"
                    >
                      <span className="font-mono text-[11.5px]">{col}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? null : (
                  <>
                    {/* Top spacer — preserves scroll height for rows above the window */}
                    {paddingTop > 0 && (
                      <tr>
                        <td colSpan={columns.length + 1} style={{ height: paddingTop }} />
                      </tr>
                    )}

                    {/* Only the visible rows are mounted */}
                    {virtualItems.map((virtualRow) => {
                      const i = virtualRow.index
                      const row = filtered[i]
                      return (
                        <tr
                          key={virtualRow.key}
                          data-index={virtualRow.index}
                          ref={rowVirtualizer.measureElement}
                          className="border-b border-cream-100 transition-colors hover:bg-cream-50/60"
                        >
                          <td className="bg-cream-50/60 px-3 py-2 text-right font-mono text-[10px] tabular-nums text-ink-400">
                            {i + 1}
                          </td>
                          {columns.map((col) => {
                            const value = row[col]
                            return (
                              <td
                                key={col}
                                className="max-w-[280px] truncate px-3 py-2 align-top text-ink-700"
                                title={value == null ? '' : String(value)}
                              >
                                {value == null ? (
                                  <span className="font-mono text-[10px] italic text-ink-400">
                                    null
                                  </span>
                                ) : (
                                  String(value)
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
                        <td colSpan={columns.length + 1} style={{ height: paddingBottom }} />
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="flex shrink-0 items-center justify-between border-t border-cream-200 bg-white px-6 py-2.5 text-[12px] text-ink-500">
        <span>
          Showing{' '}
          <span className="font-mono font-medium tabular-nums text-ink-800">
            {filtered.length}
          </span>
          {filtered.length !== rows.length && (
            <>
              {' of '}
              <span className="font-mono font-medium tabular-nums text-ink-800">
                {rows.length}
              </span>
            </>
          )}{' '}
          rows
        </span>
        <span className="hidden sm:block">
          Original file — no cleaning applied
        </span>
      </footer>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}