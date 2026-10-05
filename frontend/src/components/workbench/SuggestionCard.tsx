import type { SuggestionGroup } from './workbench-utils'

export type SuggestionCardProps = {
  group: SuggestionGroup
  active: boolean
  busy: boolean
  onSelect: () => void
  onApprove: () => void
  onReject: () => void
  onHoverColumn: (col: string | null) => void
  onVariantApprove: (
    suggestionId: string,
    action: string,
    params?: Record<string, unknown>
  ) => void
}

export function SuggestionCard({
  group,
  active,
  busy,
  onSelect,
  onApprove,
  onReject,
  onHoverColumn,
  onVariantApprove,
}: SuggestionCardProps) {
  const count = group.suggestions.length
  const first = group.suggestions[0]
  const hasVariants = !!first?.variants && first.variants.length > 0

  const rail = {
    high: 'bg-rose-100',
    medium: 'bg-amber-100',
    low: 'bg-emerald-100',
  }[group.severity]

  const badge = {
    high: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80',
    medium: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80',
    low: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80',
  }[group.severity]

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-150 ${
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
              className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${badge}`}
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

        {hasVariants ? (
          <div className="mt-3.5 space-y-1.5">
            {first.variants!.map((v) => (
              <button
                key={v.action}
                type="button"
                disabled={busy}
                onClick={() => onVariantApprove(first.id, v.action, v.params)}
                className={`w-full rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-left transition-all disabled:opacity-40 ${
                  v.recommended
                    ? 'bg-accent text-white shadow-sm hover:opacity-90'
                    : 'border border-cream-200 bg-white text-ink-700 hover:border-cream-300 hover:bg-cream-50'
                }`}
              >
                {v.recommended && <span className="mr-1">★</span>}
                {v.label}
              </button>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="w-full rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
            >
              Reject this suggestion
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}