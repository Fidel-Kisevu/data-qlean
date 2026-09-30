import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import type { ProjectMeta } from '../api/client'

type ProjectsPageProps = {
  projects: ProjectMeta[]
  loading: boolean
  onOpen: (sessionId: string) => void
  onDelete: (sessionId: string) => void
  onNew: () => void
}

export function ProjectsPage({
  projects,
  loading,
  onOpen,
  onDelete,
  onNew,
}: ProjectsPageProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
            Your work
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
            Projects
          </h1>
          <p className="mt-1 text-[13px] text-ink-500">
            {projects.length} saved session{projects.length === 1 ? '' : 's'}.
            Each keeps its own working copy, changes, and undo history.
          </p>
        </div>
        <Button variant="primary" onClick={onNew}>
          + New project
        </Button>
      </div>

      {loading ? (
        <Panel>
          <div className="py-8 text-center text-[13px] text-ink-500">
            Loading projects…
          </div>
        </Panel>
      ) : projects.length === 0 ? (
        <Panel>
          <div className="py-12 text-center">
            <p className="text-[14px] font-medium text-ink-700">
              No projects yet
            </p>
            <p className="mt-1 text-[12px] text-ink-500">
              Upload a CSV or Excel file to start.
            </p>
            <div className="mt-5">
              <Button variant="primary" onClick={onNew}>
                Upload a file
              </Button>
            </div>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.session_id}
              project={p}
              onOpen={() => onOpen(p.session_id)}
              onDelete={() => onDelete(p.session_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: ProjectMeta
  onOpen: () => void
  onDelete: () => void
}) {
  const updated = new Date(project.updated_at)
  const ago = formatAgo(updated)

  return (
    <div className="group relative overflow-hidden rounded-xl border border-cream-300 bg-white transition-colors hover:border-accent">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[12px] text-ink-700">
              {project.filename}
            </p>
            <p className="mt-1 font-mono text-[10px] text-ink-400">
              {project.session_id.slice(0, 8)}…
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 text-[11px] text-ink-500">
          <span>
            <span className="font-mono text-ink-700">{project.rows}</span> rows
          </span>
          <span className="text-ink-400">•</span>
          <span>
            <span className="font-mono text-ink-700">
              {project.columns.length}
            </span>{' '}
            cols
          </span>
        </div>

        <p className="mt-2 text-[10px] text-ink-400">
          Updated {ago}
        </p>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (confirm(`Delete "${project.filename}"? This cannot be undone.`)) {
            onDelete()
          }
        }}
        title="Delete project"
        className="absolute right-2 top-2 rounded-md border border-cream-300 bg-white px-1.5 py-0.5 text-[10px] text-ink-400 opacity-0 transition-opacity hover:border-rose-300 hover:text-rose-600 group-hover:opacity-100"
      >
        Delete
      </button>
    </div>
  )
}

function formatAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`
  return date.toLocaleDateString()
}