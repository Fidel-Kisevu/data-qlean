import { useMemo, useState } from 'react'
import { Panel } from '../components/ui/Panel'
import { SectionHeader } from '../components/ui/SectionHeader'
import type { QualityIssue } from '../types'

type QualityPageProps = {
  sessionId: string | null
  issues: QualityIssue[]
  onNavigate?: (id: 'reconcile') => void
}

type Severity = 'high' | 'medium' | 'low'
type Filter = 'all' | Severity

export function QualityPage({ sessionId, issues, onNavigate }: QualityPageProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const counts = useMemo(() => {
    return {
      all: issues.length,
      high: issues.filter((i) => i.severity === 'high').length,
      medium: issues.filter((i) => i.severity === 'medium').length,
      low: issues.filter((i) => i.severity === 'low').length,
    }
  }, [issues])

  const visible = useMemo(
    () => (filter === 'all' ? issues : issues.filter((i) => i.severity === filter)),
    [issues, filter]
  )

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Quality"
        title="Quality findings"
        actions={
          sessionId && counts.all > 0 && onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('reconcile')}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Review suggestions
            </button>
          ) : null
        }
      />

      {!sessionId ? (
        <Panel>
          <div className="py-8 text-center">
            <p className="text-[13px] text-zinc-400">Upload a file first.</p>
          </div>
        </Panel>
      ) : issues.length === 0 ? (
        <Panel>
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-emerald-400" fill="none" strokeWidth="2">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-zinc-200">
              No issues detected
            </p>
            <p className="mt-1 text-[12px] text-zinc-500">
              The current rules found nothing to fix.
            </p>
          </div>
        </Panel>
      ) : (
        <>
          {/* Filter + summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterPill
                active={filter === 'all'}
                onClick={() => setFilter('all')}
                label="All"
                count={counts.all}
              />
              <FilterPill
                active={filter === 'high'}
                onClick={() => setFilter('high')}
                label="High"
                count={counts.high}
                tone="rose"
              />
              <FilterPill
                active={filter === 'medium'}
                onClick={() => setFilter('medium')}
                label="Medium"
                count={counts.medium}
                tone="amber"
              />
              <FilterPill
                active={filter === 'low'}
                onClick={() => setFilter('low')}
                label="Low"
                count={counts.low}
                tone="emerald"
              />
            </div>

            <p className="text-[11px] text-zinc-500">
              <span className="text-zinc-300">{counts.high}</span> high ·{' '}
              <span className="text-zinc-300">{counts.medium}</span> medium ·{' '}
              <span className="text-zinc-300">{counts.low}</span> low
            </p>
          </div>

          {/* Issues list */}
          {visible.length === 0 ? (
            <Panel>
              <div className="py-8 text-center">
                <p className="text-[13px] text-zinc-400">
                  No {filter} severity issues.
                </p>
              </div>
            </Panel>
          ) : (
            <div className="space-y-2">
              {visible.map((issue, index) => (
                <IssueRow key={`${issue.rule_id ?? 'rule'}-${issue.column ?? 'x'}-${index}`} issue={issue} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

/* ---- Row ---- */

function IssueRow({ issue }: { issue: QualityIssue }) {
  const severity = (issue.severity as Severity) ?? 'low'
  const styles = {
    high: {
      badge: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20',
      dot: 'bg-rose-400',
      bar: 'bg-rose-400/60',
    },
    medium: {
      badge: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20',
      dot: 'bg-amber-400',
      bar: 'bg-amber-400/60',
    },
    low: {
      badge: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20',
      dot: 'bg-emerald-400',
      bar: 'bg-emerald-400/60',
    },
  }[severity]

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Severity rail */}
      <div className={`absolute left-0 top-0 h-full w-1 ${styles.bar}`} />

      <div className="flex items-start gap-3 p-4 pl-5">
        <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles.badge}`}>
          {severity}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-zinc-200">{issue.message}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
            {issue.rule_id && (
              <span className="font-mono text-zinc-500">{issue.rule_id}</span>
            )}
            {!issue.rule_id && issue.type && (
              <span className="font-mono text-zinc-500">{issue.type}</span>
            )}
            {issue.column && (
              <>
                <span className="text-zinc-700">•</span>
                <span>
                  column <span className="text-zinc-300">{issue.column}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---- Filter pill ---- */

function FilterPill({
  active,
  onClick,
  label,
  count,
  tone = 'neutral',
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  tone?: 'neutral' | 'rose' | 'amber' | 'emerald'
}) {
  const dotTone = {
    neutral: 'bg-zinc-400',
    rose: 'bg-rose-400',
    amber: 'bg-amber-400',
    emerald: 'bg-emerald-400',
  }[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
        active
          ? 'border-zinc-700 bg-zinc-800 text-zinc-100'
          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} />
      {label}
      <span className={`ml-0.5 font-mono text-[10px] ${active ? 'text-zinc-400' : 'text-zinc-600'}`}>
        {count}
      </span>
    </button>
  )
}