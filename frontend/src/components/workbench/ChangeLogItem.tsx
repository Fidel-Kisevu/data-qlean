import type { Change } from '../../types'

export type ChangeLogItemProps = {
  change: Change
}

export function ChangeLogItem({ change }: ChangeLogItemProps) {
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
