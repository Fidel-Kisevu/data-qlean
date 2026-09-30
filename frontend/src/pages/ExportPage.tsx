
import { Panel } from '../components/ui/Panel'
import { SectionHeader } from '../components/ui/SectionHeader'

type ExportPageProps = {
  sessionId: string | null
  filename?: string
  rowCount?: number
  columnCount?: number
  csvUrl: string
  xlsxUrl: string
}

export function ExportPage({
  sessionId,
  filename,
  rowCount,
  columnCount,
  csvUrl,
  xlsxUrl,
}: ExportPageProps) {
  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Export"
        title="Download cleaned data"
        actions={
          <p className="text-[11px] text-zinc-500">
            Working copy · original untouched
          </p>
        }
      />

      {!sessionId ? (
        <Panel>
          <div className="py-8 text-center">
            <p className="text-[13px] text-zinc-400">Upload a file first.</p>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* ---------- Download options ---------- */}
          <Panel className="p-5">
            <div className="mb-4">
              <h3 className="text-[14px] font-semibold text-zinc-100">
                Choose a format
              </h3>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Both formats include every approved change.
              </p>
            </div>

            <div className="space-y-2.5">
              <ExportOption
                title="CSV"
                description="Universal, lightweight, great for scripts and BI tools."
                extension=".csv"
                url={csvUrl}
                primary
              />
              <ExportOption
                title="Excel"
                description="Preserves types and column widths. Best for sharing."
                extension=".xlsx"
                url={xlsxUrl}
              />
            </div>

            <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3.5 py-3">
              <p className="text-[11px] text-zinc-500">
                <span className="font-medium text-zinc-300">Note:</span>{' '}
                Your original upload was never modified. Exports reflect
                only the working copy after approved changes.
              </p>
            </div>
          </Panel>

          {/* ---------- Summary ---------- */}
          <Panel className="p-5">
            <div className="mb-4">
              <h3 className="text-[14px] font-semibold text-zinc-100">
                What you'll get
              </h3>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Snapshot of the working copy
              </p>
            </div>

            <dl className="space-y-2.5">
              <SummaryRow label="File" value={filename || 'Untitled'} mono />
              <SummaryRow
                label="Rows"
                value={rowCount != null ? String(rowCount) : '—'}
              />
              <SummaryRow
                label="Columns"
                value={columnCount != null ? String(columnCount) : '—'}
              />
              <SummaryRow
                label="Session"
                value={sessionId.slice(0, 8) + '…'}
                mono
              />
            </dl>

            <div className="mt-5 flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Ready to export
            </div>
          </Panel>
        </div>
      )}
    </section>
  )
}

/* ---- Export option row ---- */

function ExportOption({
  title,
  description,
  extension,
  url,
  primary = false,
}: {
  title: string
  description: string
  extension: string
  url: string
  primary?: boolean
}) {
  return (
    <a
      href={url}
      download
      className="group flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3.5 transition-colors hover:border-zinc-700 hover:bg-zinc-950"
    >
      <div className="flex min-w-0 items-center gap-3">
        {/* Format icon */}
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-zinc-800 bg-zinc-900 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          {extension.replace('.', '')}
        </div>

        <div className="min-w-0">
          <p className="text-[13px] font-medium text-zinc-200">{title}</p>
          <p className="truncate text-[11px] text-zinc-500">{description}</p>
        </div>
      </div>

      <span
        className={`shrink-0 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
          primary
            ? 'bg-emerald-600 text-white group-hover:bg-emerald-500'
            : 'border border-zinc-800 bg-zinc-900 text-zinc-300 group-hover:border-zinc-700 group-hover:text-zinc-100'
        }`}
      >
        Download
      </span>
    </a>
  )
}

/* ---- Summary row ---- */

function SummaryRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800/70 pb-2.5 last:border-b-0 last:pb-0">
      <dt className="text-[11px] uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd
        className={`truncate text-right text-[13px] text-zinc-200 ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  )
}