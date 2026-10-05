export type WorkbenchFooterProps = {
  rowsCount: number
  columnsCount: number
  changesCount: number
  flagsCount: number
  showOnlyFlagged: boolean
  visibleCount: number
}

export function WorkbenchFooter({
  rowsCount,
  columnsCount,
  changesCount,
  flagsCount,
  showOnlyFlagged,
  visibleCount,
}: WorkbenchFooterProps) {
  return (
    <footer className="flex shrink-0 items-center justify-between border-t border-cream-200 bg-white px-6 py-2.5">
      <div className="flex items-center gap-3 text-[12px] text-ink-500">
        <span>
          <span className="font-mono font-medium tabular-nums text-ink-800">
            {showOnlyFlagged ? `${visibleCount} of ${rowsCount}` : rowsCount}
          </span>{' '}
          rows
        </span>
        <span className="text-cream-300">·</span>
        <span>
          <span className="font-mono font-medium tabular-nums text-ink-800">
            {columnsCount}
          </span>{' '}
          columns
        </span>
        <span className="text-cream-300">·</span>
        <span>
          <span className="font-mono font-medium tabular-nums text-ink-800">
            {changesCount}
          </span>{' '}
          changes applied
        </span>
        {flagsCount > 0 && (
          <>
            <span className="text-cream-300">·</span>
            <span className="text-rose-600">
              <span className="font-mono font-medium tabular-nums">
                {flagsCount}
              </span>{' '}
              flagged cell{flagsCount === 1 ? '' : 's'}
            </span>
          </>
        )}
      </div>
      <p className="hidden text-[12px] text-ink-400 sm:block">
        Click any cell to edit · click a column name to rename
      </p>
    </footer>
  )
}
