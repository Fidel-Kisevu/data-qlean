// src/pages/ChangesPage.tsx
import { Panel } from '../components/ui/Panel'
import { SectionHeader } from '../components/ui/SectionHeader'
import type { Change } from '../types'

type ChangesPageProps = {
  sessionId: string | null
  changes: Change[]
  onReset?: () => void
}

export function ChangesPage({ sessionId, changes, onReset }: ChangesPageProps) {
  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="History"
        title="Applied changes"
        actions={
          changes.length > 0 && onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[12px] text-zinc-400 transition-colors hover:border-rose-500/40 hover:text-rose-300"
            >
              Reset to original
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
      ) : changes.length === 0 ? (
        <Panel>
          <div className="py-10 text-center">
            <p className="text-[13px] font-medium text-zinc-200">
              No changes yet
            </p>
            <p className="mt-1 text-[12px] text-zinc-500">
              Approve suggestions in Reconcile, or edit columns in Transform.
            </p>
          </div>
        </Panel>
      ) : (
        <div className="space-y-2">
          {changes.map((change, i) => (
            <ChangeRow key={change.id} change={change} index={i + 1} />
          ))}
        </div>
      )}
    </section>
  )
}

function ChangeRow({ change, index }: { change: Change; index: number }) {
  const tone = change.action.startsWith('approve')
    ? 'emerald'
    : change.action === 'reject_suggestion'
    ? 'rose'
    : change.action === 'drop_column'
    ? 'rose'
    : 'sky'

  const rail = {
    emerald: 'bg-emerald-400/60',
    rose: 'bg-rose-400/60',
    sky: 'bg-sky-400/60',
  }[tone]

  const chip = {
    emerald: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20',
    sky: 'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/20',
  }[tone]

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <div className={`absolute left-0 top-0 h-full w-1 ${rail}`} />

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-zinc-800 font-mono text-[10px] text-zinc-400">
              {index}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${chip}`}>
                  {change.action.replace('_', ' ')}
                </span>
                {change.column && (
                  <span className="text-[11px] text-zinc-500">
                    column <span className="text-zinc-300">{change.column}</span>
                  </span>
                )}
              </div>
              <p className="mt-2 text-[13px] text-zinc-200">{change.description}</p>
            </div>
          </div>

          <time className="shrink-0 text-[11px] text-zinc-600">
            {new Date(change.applied_at).toLocaleTimeString()}
          </time>
        </div>

        {/* Before/after sample */}
        {change.before && change.after && (
          <div className="mt-3 grid gap-2 pl-9 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                Before
              </p>
              <p className="mt-1 truncate font-mono text-[11px] text-zinc-400">
                {change.before.sample.join(', ')}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                After
              </p>
              <p className="mt-1 truncate font-mono text-[11px] text-emerald-300">
                {change.after.sample.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}