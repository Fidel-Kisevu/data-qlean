import { Panel } from '../components/ui/Panel'
import { SectionHeader } from '../components/ui/SectionHeader'
import { StatusDot } from '../components/ui/StatusDot'
import type { Profile, Suggestion } from '../types'

type DashboardPageProps = {
  sessionId: string | null
  filename: string
  profile: Profile | null
  issues: { severity: string; message: string }[]
  suggestions: Suggestion[]
}

export function DashboardPage({
  sessionId,
  filename,
  profile,
  issues,
  suggestions,
}: DashboardPageProps) {
  const pending = suggestions.filter((s) => s.status === 'pending').length
  const approved = suggestions.filter((s) => s.status === 'approved').length
  const highIssues = issues.filter((i) => i.severity === 'high').length

  const statCards = [
    { label: 'Rows', value: profile?.row_count ?? '—' },
    { label: 'Columns', value: profile?.column_count ?? '—' },
    { label: 'Issues', value: issues.length, hint: highIssues > 0 ? `${highIssues} high` : undefined },
    { label: 'Suggestions', value: pending, hint: approved > 0 ? `${approved} approved` : undefined },
  ]

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Overview"
        title="Workspace dashboard"
        actions={
          sessionId ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400">
              <StatusDot color="green" />
              Session active
            </div>
          ) : null
        }
      />

      {!sessionId ? (
        <Panel>
          <div className="py-8 text-center">
            <p className="text-[13px] text-zinc-400">
              Upload a file first to begin profiling and reviewing suggestions.
            </p>
          </div>
        </Panel>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <Panel key={card.label} className="p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  {card.label}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100 tabular-nums">
                  {card.value}
                </p>
                {card.hint && (
                  <p className="mt-1 text-[11px] text-zinc-500">{card.hint}</p>
                )}
              </Panel>
            ))}
          </div>

          {/* Two-column detail */}
          <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
            {/* Data profile */}
            <Panel className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-zinc-100">
                    Data profile
                  </h3>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Null coverage for the top columns
                  </p>
                </div>
                <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                  Live
                </span>
              </div>

              <div className="space-y-2.5">
                {profile &&
                  Object.entries(profile.columns)
                    .slice(0, 5)
                    .map(([name, meta]) => {
                      const nullPct = Math.min(meta.null_pct, 100)
                      const tone =
                        nullPct >= 60
                          ? 'bg-rose-400'
                          : nullPct >= 30
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      return (
                        <div
                          key={name}
                          className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-4">
                            <span className="truncate text-[13px] font-medium text-zinc-200">
                              {name}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] text-zinc-500">
                              {meta.dtype}
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className={`h-full rounded-full ${tone}`}
                              style={{ width: `${nullPct}%` }}
                            />
                          </div>

                          <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
                            <span>
                              <span className="text-zinc-400">{meta.null_count}</span>{' '}
                              nulls
                            </span>
                            <span>
                              <span className="text-zinc-400">{meta.unique_count}</span>{' '}
                              unique
                            </span>
                          </div>
                        </div>
                      )
                    })}
                {profile && Object.keys(profile.columns).length > 5 && (
                  <p className="pt-1 text-center text-[11px] text-zinc-600">
                    +{Object.keys(profile.columns).length - 5} more columns
                  </p>
                )}
              </div>
            </Panel>

            {/* Quick status */}
            <Panel className="p-5">
              <div className="mb-4">
                <h3 className="text-[14px] font-semibold text-zinc-100">
                  Quick status
                </h3>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Snapshot of the working copy
                </p>
              </div>

              <div className="space-y-2.5">
                <StatusRow
                  label="Detected issues"
                  value={issues.length}
                  tone={issues.length > 0 ? 'amber' : 'emerald'}
                />
                <StatusRow
                  label="Pending suggestions"
                  value={pending}
                  tone={pending > 0 ? 'sky' : 'emerald'}
                />
                <StatusRow
                  label="Approved so far"
                  value={approved}
                  tone="emerald"
                />

                <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Current file
                  </p>
                  <p className="mt-1.5 truncate text-[13px] font-medium text-zinc-200">
                    {filename || '—'}
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}
    </section>
  )
}

/* ---- Small internal helper ---- */

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'emerald' | 'amber' | 'sky'
}) {
  const dot = {
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    sky: 'bg-sky-400',
  }[tone]

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="text-[13px] text-zinc-400">{label}</span>
      </div>
      <span className="font-mono text-[15px] font-medium text-zinc-100 tabular-nums">
        {value}
      </span>
    </div>
  )
}