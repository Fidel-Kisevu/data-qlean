import type { RefObject } from 'react'
import { ToolsMenu } from '../ToolsMenu'
import type { ProjectMeta } from '../../api/client'

export type AppHeaderView = 'upload' | 'workbench' | 'clean' | 'preview'

type AppHeaderProps = {
  view: AppHeaderView
  projects: ProjectMeta[]
  sessionId: string | null
  filename: string
  backendOk: boolean | null
  menuOpen: boolean
  menuRef: RefObject<HTMLDivElement>
  toolsMenuOpen: boolean
  toolsMenuRef: RefObject<HTMLDivElement>
  busy: boolean
  columns: string[]
  onToggleMenu: () => void
  onToggleToolsMenu: () => void
  onOpenProject: (sid: string) => void
  onDeleteProject: (sid: string) => void
  onSetView: (view: AppHeaderView) => void
  onAddNewProject: () => void
  onCloseToolsMenu: () => void
  onToolsDialog: (kind: 'replace' | 'regex' | 'rename' | 'drop' | 'reorder') => void
  onToolsAction: (action: string, params?: Record<string, unknown>) => void
  onResetToOriginal: () => void
  onCopyChangeLog: () => void
}

export function AppHeader({
  view,
  projects,
  sessionId,
  filename,
  backendOk,
  menuOpen,
  menuRef,
  toolsMenuOpen,
  toolsMenuRef,
  busy,
  columns,
  onToggleMenu,
  onToggleToolsMenu,
  onOpenProject,
  onDeleteProject,
  onSetView,
  onAddNewProject,
  onCloseToolsMenu,
  onToolsDialog,
  onToolsAction,
  onResetToOriginal,
  onCopyChangeLog,
}: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-cream-300 bg-white px-5 justify-between">
      <div className="flex items-center gap-2.5">
        <div className="text-[15px] font-semibold tracking-tight text-ink-900">
          Data Qlean
        </div>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={onToggleMenu}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-bold transition-colors ${
            menuOpen
              ? 'bg-cream-00 text-ink-900'
              : 'text-ink-500 hover:bg-cream-100 hover:text-ink-900'
          }`}
        >
          Projects
          <span className="text-[9px] opacity-60">▾</span>
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 w-[320px] rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-cream-200 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                {projects.length} project{projects.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-1.5">
              {projects.length === 0 ? (
                <div className="px-3 py-4 text-center text-[12px] text-ink-500">
                  No projects yet.
                </div>
              ) : (
                projects.map((p) => (
                  <div
                    key={p.session_id}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-cream-100"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenProject(p.session_id)}
                      className="min-w-0 flex-1 truncate text-left"
                    >
                      <p
                        className={`truncate font-mono text-[12px] ${
                          p.session_id === sessionId
                            ? 'text-accent'
                            : 'text-ink-700'
                        }`}
                      >
                        {p.filename}
                      </p>
                      <p className="truncate text-[10px] text-ink-400">
                        {p.rows} rows · {p.columns.length} cols ·{' '}
                        {formatAgo(new Date(p.updated_at))}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Delete "${p.filename}"? This cannot be undone.`)) {
                          onDeleteProject(p.session_id)
                        }
                      }}
                      title="Delete"
                      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-ink-400 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {sessionId && (
        <nav className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSetView('preview')}
            className={`rounded-md px-2.5 py-1.5 text-[13px] font-bold ${
              view === 'preview'
                ? 'bg-cream-900 text-ink-200'
                : 'text-ink-500 hover:bg-cream-100 hover:text-ink-900'
            }`}
          >
            Original
          </button>
          

          <button
            type="button"
            onClick={() => onSetView('workbench')}
            className={`rounded-md px-2.5 py-1.5 text-[13px] font-bold ${
              view === 'workbench'
                ? 'bg-cream-900 text-ink-100'
                : 'text-ink-500 hover:bg-cream-100 hover:text-ink-900'
            }`}
          >
            Workbench
          </button>

          <button
            type="button"
            onClick={() => onSetView('clean')}
            className={`rounded-md px-2.5 py-1.5 text-[13px] font-bold ${
              view === 'clean'
                ? 'bg-cream-900 text-ink-100'
                : 'text-ink-500 hover:bg-cream-100 hover:text-ink-700'
            }`}
          >
            Clean
          </button>
           <div className="relative" ref={toolsMenuRef}>
        <button
          type="button"
          onClick={onToggleToolsMenu}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-bold transition-colors ${
            toolsMenuOpen
              ? 'bg-cream-900 text-ink-100'
              : 'text-ink-500 hover:bg-cream-100 hover:text-ink-900'
          }`}
        >
          Tools
          <span className="text-[9px] opacity-60">▾</span>
        </button>

        <ToolsMenu
          open={toolsMenuOpen}
          busy={busy}
          columns={columns}
          onClose={onCloseToolsMenu}
          onOpenDialog={onToolsDialog}
          onAction={onToolsAction}
          onResetToOriginal={onResetToOriginal}
          onCopyChangeLog={onCopyChangeLog}
        />
      </div>
        </nav>
      )}

      <button
        type="button"
        onClick={onAddNewProject}
        className={`rounded-md px-2.5 py-1.5 text-[13px] font-bold transition-colors ${
          view === 'upload'
            ? 'bg-cream-900 text-ink-100'
            : 'text-ink-500 hover:bg-cream-200/70 hover:text-ink-700'
        }`}
      >
        + Add new project
      </button>

     

      <div className="ml-auto flex items-center gap-3">
        {(view === 'workbench' || view === 'clean' || view === 'preview') && sessionId && (
          <div className="flex items-center gap-2 rounded-md border border-cream-300 bg-cream-50 px-2.5 py-1">
            <span className="text-[11px] font-medium text-ink-500">
              {filename || 'Untitled'}
            </span>
            <span className="text-[10px] text-ink-400">•</span>
            <span className="font-mono text-[10px] text-ink-400">
              {sessionId.slice(0, 6)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span
            className={`relative flex h-2 w-2 ${
              backendOk === true ? '' : 'opacity-80'
            }`}
          >
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                backendOk === true
                  ? 'animate-ping bg-emerald-400 opacity-40'
                  : ''
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                backendOk === true
                  ? 'bg-emerald-500'
                  : backendOk === false
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="text-[11px] font-medium text-ink-500">
            {backendOk === true
              ? 'Online'
              : backendOk === false
                ? 'Offline'
                : 'Connecting'}
          </span>
        </div>
      </div>
    </header>
  )
}

function formatAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return date.toLocaleDateString()
}
