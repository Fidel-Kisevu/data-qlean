import type { QualityIssue } from '../../types'

export type IssuesListProps = {
  issues: QualityIssue[]
  onHoverColumn: (col: string | null) => void
}

const severityStyles = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-rose-100 text-rose-700',
} as const

const severityDots = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-rose-500',
} as const

export function IssuesList({ issues, onHoverColumn }: IssuesListProps) {
  if (issues.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center px-4 py-8 text-center">
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-emerald-50">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 stroke-emerald-600"
            fill="none"
            strokeWidth="2.25"
          >
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-[13px] font-medium text-ink-800">No issues found</p>
        <p className="mt-1 max-w-[220px] text-[12px] leading-relaxed text-ink-500">
          All quality checks passed on the current data.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-3">
      {issues.map((issue, index) => {
        const severity = issue.severity ?? 'medium'
        const column = issue.column ?? null

        return (
          <button
            key={`${issue.rule_id ?? issue.type}-${column ?? 'row'}-${index}`}
            type="button"
            onMouseEnter={() => onHoverColumn(column)}
            onMouseLeave={() => onHoverColumn(null)}
            className="w-full rounded-xl border border-cream-200 bg-white p-2.5 text-left transition-colors hover:border-cream-300 hover:bg-cream-50"
          >
            <div className="flex items-start gap-2">
              <span className={`mt-1 h-2 w-2 rounded-full ${severityDots[severity]}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${severityStyles[severity]}`}
                  >
                    {severity}
                  </span>
                  {column && (
                    <span className="font-mono text-[10px] text-ink-500">{column}</span>
                  )}
                </div>

                <p className="mt-2 text-[12px] leading-relaxed text-ink-700">{issue.message}</p>

                {issue.rule_id && (
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                    {issue.rule_id}
                  </p>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
