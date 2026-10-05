import type { Profile } from '../../types'

export type ColumnProfilesProps = {
  profile: Profile | null
  onHoverColumn: (col: string | null) => void
}

export function ColumnProfiles({ profile, onHoverColumn }: ColumnProfilesProps) {
  const columns = profile ? Object.entries(profile.columns) : []

  if (!profile || columns.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center px-4 py-8 text-center">
        <div className="mb-3 rounded-full bg-cream-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">
          Data
        </div>
        <p className="text-[13px] font-medium text-ink-800">No profile available</p>
        <p className="mt-1 max-w-[220px] text-[12px] leading-relaxed text-ink-500">
          Upload a file to see column profiles.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-3">
      {columns.map(([name, info]) => {
        const sample = info.sample_values?.[0] ?? null

        return (
          <button
            key={name}
            type="button"
            onMouseEnter={() => onHoverColumn(name)}
            onMouseLeave={() => onHoverColumn(null)}
            className="w-full rounded-xl border border-cream-200 bg-white p-2.5 text-left transition-colors hover:border-cream-300 hover:bg-cream-50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-ink-700">{name}</span>
              <span className="rounded-full bg-cream-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-ink-500">
                {info.dtype}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-ink-500">
              <div>
                <span className="text-ink-400">nulls</span>{' '}
                <span className="font-mono text-ink-700">{info.null_count}</span>
              </div>
              <div>
                <span className="text-ink-400">null%</span>{' '}
                <span className="font-mono text-ink-700">{info.null_pct.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-ink-400">unique</span>{' '}
                <span className="font-mono text-ink-700">{info.unique_count}</span>
              </div>
              <div className="truncate">
                <span className="text-ink-400">sample</span>{' '}
                <span className="font-mono text-ink-700">{sample ?? '—'}</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
