import { Panel } from '../components/ui/Panel'
import { SectionHeader } from '../components/ui/SectionHeader'

type DataViewPageProps = {
  sessionId: string | null
  columns: string[]
  rows: Record<string, unknown>[]
}

export function DataViewPage({ sessionId, columns, rows }: DataViewPageProps) {
  return (
    <section className="space-y-5">
      <SectionHeader eyebrow="Table" title="Data view" />

      {!sessionId ? (
        <Panel>
          <div className="py-8 text-center">
            <p className="text-[13px] text-zinc-400">Upload a file first.</p>
          </div>
        </Panel>
      ) : columns.length === 0 ? (
        <Panel>
          <div className="py-8 text-center">
            <p className="text-[13px] text-zinc-400">No columns to display.</p>
          </div>
        </Panel>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          {/* Table toolbar */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
            <div className="flex items-center gap-3 text-[12px] text-zinc-500">
              <span>
                <span className="font-medium text-zinc-300">{rows.length}</span>{' '}
                {rows.length === 1 ? 'row' : 'rows'}
              </span>
              <span className="text-zinc-700">•</span>
              <span>
                <span className="font-medium text-zinc-300">{columns.length}</span>{' '}
                {columns.length === 1 ? 'column' : 'columns'}
              </span>
            </div>
            <span className="text-[11px] text-zinc-600">
              Working copy · original untouched
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-zinc-950/60">
                  {/* Row number gutter */}
                  <th className="sticky left-0 z-10 w-10 border-b border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-right text-[11px] font-medium text-zinc-600">
                    #
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="whitespace-nowrap border-b border-zinc-800 px-4 py-2.5 font-medium text-zinc-300"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-zinc-800/70 last:border-b-0 hover:bg-zinc-800/40"
                  >
                    <td className="sticky left-0 z-10 bg-zinc-900 px-3 py-2 text-right font-mono text-[11px] text-zinc-600">
                      {index + 1}
                    </td>
                    {columns.map((column) => {
                      const value = row[column]
                      return (
                        <td
                          key={`${column}-${index}`}
                          className="max-w-[280px] truncate px-4 py-2 align-top text-zinc-200"
                          title={value == null ? '' : String(value)}
                        >
                          {value == null ? (
                            <span className="font-mono text-[11px] italic text-zinc-600">
                              null
                            </span>
                          ) : (
                            String(value)
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2.5 text-[11px] text-zinc-600">
            <span>Showing first {rows.length} rows</span>
            <span>Session {sessionId.slice(0, 8)}…</span>
          </div>
        </div>
      )}
    </section>
  )
}