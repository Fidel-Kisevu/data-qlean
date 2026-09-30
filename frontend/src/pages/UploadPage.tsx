import { useState } from 'react'
import { Panel } from '../components/ui/Panel'
import { SectionHeader } from '../components/ui/SectionHeader'

type UploadPageProps = {
  busy: boolean
  filename: string
  onUpload: (file: File) => void
}

const ACCEPTED = '.csv,.xlsx,.xls'

export function UploadPage({ busy, filename, onUpload }: UploadPageProps) {
  const [dragging, setDragging] = useState(false)

  const handleFile = (file: File | undefined | null) => {
    if (!file || busy) return
    onUpload(file)
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Upload"
        title={filename ? 'Replace current file' : 'Load a messy CSV or Excel file'}
        actions={
          filename ? (
            <p className="text-[12px] text-ink-500">
              Currently loaded:{' '}
              <span className="font-medium text-ink-800">{filename}</span>
            </p>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* ---------- Drop zone ---------- */}
        <Panel className="p-5">
          <label
            onDragOver={(e) => {
              e.preventDefault()
              if (!busy) setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const file = e.dataTransfer.files?.[0]
              handleFile(file)
            }}
            className={`group relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
              busy
                ? 'cursor-wait border-cream-200 bg-cream-50/80 opacity-70'
                : dragging
                  ? 'border-accent bg-accent-soft/50 shadow-sm ring-2 ring-accent/15'
                  : 'border-cream-300 bg-cream-50/60 hover:border-cream-400 hover:bg-cream-50'
            }`}
          >
            <input
              type="file"
              accept={ACCEPTED}
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />

            {/* Icon */}
            <div
              className={`mb-5 grid h-14 w-14 place-items-center rounded-2xl transition-all duration-200 ${
                dragging
                  ? 'bg-accent-soft ring-2 ring-accent/25'
                  : 'bg-white shadow-sm ring-1 ring-cream-200 group-hover:ring-cream-300'
              }`}
            >
              {busy ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 animate-spin text-ink-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364-2.121 2.121M8.757 15.243l-2.121 2.121m12.728 0-2.121-2.121M8.757 8.757 6.636 6.636"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className={`h-6 w-6 transition-colors ${
                    dragging ? 'stroke-accent' : 'stroke-ink-400 group-hover:stroke-ink-600'
                  }`}
                  fill="none"
                  strokeWidth="1.75"
                >
                  <path
                    d="M12 16V4m0 0 4 4m-4-4-4 4M4 16.5v2A1.5 1.5 0 0 0 5.5 20h13A1.5 1.5 0 0 0 20 18.5v-2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            {busy ? (
              <>
                <p className="text-[15px] font-semibold text-ink-800">
                  Uploading…
                </p>
                <p className="mt-1.5 max-w-[240px] text-[13px] leading-relaxed text-ink-500">
                  Parsing file and profiling columns.
                </p>
              </>
            ) : dragging ? (
              <>
                <p className="text-[15px] font-semibold text-accent">
                  Drop to upload
                </p>
                <p className="mt-1.5 text-[13px] text-ink-500">
                  Release anywhere in this area.qq
                </p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-ink-900">
                  Drop a file here, or{' '}
                  <span className="text-accent underline decoration-accent/30 underline-offset-[3px] transition-colors group-hover:decoration-accent/60">
                    browse
                  </span>
                </p>
                <p className="mt-1.5 text-[13px] text-ink-500">
                  CSV, XLSX, or XLS · up to a few MB is fine
                </p>
              </>
            )}
          </label>

          {/* Reassurance */}
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-cream-200 bg-cream-50/80 px-4 py-3.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <p className="text-[12.5px] leading-relaxed text-ink-500">
              <span className="font-medium text-ink-800">Non-destructive.</span>{' '}
              All transforms apply to a working copy. Your original file is never
              modified.
            </p>
          </div>
        </Panel>

        {/* ---------- Right column ---------- */}
        <div className="space-y-4">
          {/* Current file */}
          <Panel className="p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-ink-400">
              Current file
            </h3>
            {filename ? (
              <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-cream-200 bg-cream-50/80 px-3.5 py-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white ring-1 ring-cream-200">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-ink-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  >
                    <path
                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="min-w-0 truncate font-mono text-[12.5px] font-medium text-ink-800">
                  {filename}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-ink-500">Nothing loaded yet.</p>
            )}
          </Panel>

          {/* What happens next */}
          <Panel className="p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-ink-400">
              What happens next
            </h3>
            <ol className="mt-4 space-y-3.5">
              <Step n={1} label="Profile" hint="Rows, columns, nulls, types" />
              <Step n={2} label="Find issues" hint="Rule-based quality checks" />
              <Step n={3} label="Suggest fixes" hint="You approve each one" />
              <Step n={4} label="Export" hint="CSV or Excel, clean" />
            </ol>
          </Panel>
        </div>
      </div>
    </section>
  )
}

/* ---- Step helper ---- */

function Step({ n, label, hint }: { n: number; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-cream-100 font-mono text-[11px] font-semibold tabular-nums text-ink-500 ring-1 ring-cream-200/80">
        {n}
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block text-[13px] font-medium text-ink-800">{label}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-ink-500">
          {hint}
        </span>
      </span>
    </li>
  )
}