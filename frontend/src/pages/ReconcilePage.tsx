import { useMemo, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { SectionHeader } from '../components/ui/SectionHeader'
import type { Suggestion } from '../types'

type ReconcilePageProps = {
  sessionId: string | null
  suggestions: Suggestion[]
  busy: boolean
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all'

export function ReconcilePage({
  sessionId,
  suggestions,
  busy,
  onApprove,
  onReject,
}: ReconcilePageProps) {
  const [filter, setFilter] = useState<StatusFilter>('pending')

  const counts = useMemo(() => {
    return {
      pending: suggestions.filter((s) => s.status === 'pending').length,
      approved: suggestions.filter((s) => s.status === 'approved').length,
      rejected: suggestions.filter((s) => s.status === 'rejected').length,
      all: suggestions.length,
    }
  }, [suggestions])

  const visible = useMemo(() => {
    if (filter === 'all') return suggestions
    return suggestions.filter((s) => s.status === filter)
  }, [suggestions, filter])

  const progress =
    counts.all > 0 ? Math.round(((counts.approved + counts.rejected) / counts.all) * 100) : 0

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Reconcile"
        title="Approve or reject suggestions"
        actions={
          counts.all > 0 ? (
            <p className="text-[11px] text-zinc-500">
              <span className="text-zinc-300">{progress}%</span> reviewed
            </p>
          ) : null
        }
      />

      {!sessionId ? (
        <Panel>
          <div className="py-8 text-center">
            <p className="text-[13px] text-zinc-400">Upload a file first.</p>
          </div>
        </Panel>
      ) : suggestions.length === 0 ? (
        <Panel>
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-emerald-400" fill="none" strokeWidth="2">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-zinc-200">
              Nothing to reconcile
            </p>
            <p className="mt-1 text-[12px] text-zinc-500">
              No suggestions were generated for this file.
            </p>
          </div>
        </Panel>
      ) : (
        <>
          {/* Progress bar */}
          <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterPill
              active={filter === 'pending'}
              onClick={() => setFilter('pending')}
              label="Pending"
              count={counts.pending}
              tone="sky"
            />
            <FilterPill
              active={filter === 'approved'}
              onClick={() => setFilter('approved')}
              label="Approved"
              count={counts.approved}
              tone="emerald"
            />
            <FilterPill
              active={filter === 'rejected'}
              onClick={() => setFilter('rejected')}
              label="Rejected"
              count={counts.rejected}
              tone="rose"
            />
            <FilterPill
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              label="All"
              count={counts.all}
              tone="neutral"
            />
          </div>

          {/* Suggestion list */}
          {visible.length === 0 ? (
            <Panel>
              <div className="py-8 text-center">
                <p className="text-[13px] text-zinc-400">
                  No {filter === 'all' ? '' : filter} suggestions.
                </p>
              </div>
            </Panel>
          ) : (
            <div className="space-y-2">
              {visible.map((suggestion) => (
                <SuggestionRow
                  key={suggestion.id}
                  suggestion={suggestion}
                  busy={busy}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

/* ---- Suggestion row ---- */

function SuggestionRow({
  suggestion,
  busy,
  onApprove,
  onReject,
}: {
  suggestion: Suggestion
  busy: boolean
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const severity = (suggestion.severity as 'high' | 'medium' | 'low') ?? 'low'
  const isPending = suggestion.status === 'pending'
  const isApproved = suggestion.status === 'approved'
  const isRejected = suggestion.status === 'rejected'

  const styles = {
    high: {
      badge: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20',
      rail: 'bg-rose-400/60',
    },
    medium: {
      badge: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20',
      rail: 'bg-amber-400/60',
    },
    low: {
      badge: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20',
      rail: 'bg-emerald-400/60',
    },
  }[severity]

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Severity rail */}
      <div className={`absolute left-0 top-0 h-full w-1 ${styles.rail}`} />

      <div className="flex flex-col gap-4 p-4 pl-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles.badge}`}
            >
              {severity}
            </span>
            {suggestion.column && (
              <span className="text-[11px] text-zinc-500">
                column <span className="text-zinc-300">{suggestion.column}</span>
              </span>
            )}
          </div>

          <h3 className="mt-2.5 text-[14px] font-semibold text-zinc-100">
            {suggestion.title}
          </h3>
          <p className="mt-1 text-[13px] text-zinc-400">
            {suggestion.description}
          </p>

          <div className="mt-2.5 flex items-center gap-2 text-[11px]">
            {isPending && (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                <span className="text-sky-300">Pending review</span>
              </>
            )}
            {isApproved && (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-emerald-300">Approved</span>
              </>
            )}
            {isRejected && (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                <span className="text-rose-300">Rejected</span>
              </>
            )}
          </div>
        </div>

        {isPending && (
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => onApprove(suggestion.id)}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => onReject(suggestion.id)}
            >
              Reject
            </Button>
          </div>
        )}
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
  tone,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  tone: 'neutral' | 'sky' | 'emerald' | 'rose'
}) {
  const dot = {
    neutral: 'bg-zinc-400',
    sky: 'bg-sky-400',
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
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
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
      <span
        className={`ml-0.5 font-mono text-[10px] ${
          active ? 'text-zinc-400' : 'text-zinc-600'
        }`}
      >
        {count}
      </span>
    </button>
  )
}