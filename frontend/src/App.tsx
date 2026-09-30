import { useCallback, useEffect, useRef, useState } from 'react'
import {
  apiHealthCheck,
  applySuggestion,
  clearChangesRemote,
  deleteProject,
  exportDataUrl,
  fetchChanges,
  fetchDataView,
  fetchProjects,
  fetchQuality,
  fetchSuggestions,
  popLastChange,
  recordChangeRemote,
  transformWorkingCopy,
  undoLast,
  uploadFile,
  type ProjectMeta,
} from './api/client'

import { PageBoundary } from './components/ui/PageBoundary'
import { UploadPage } from './pages/UploadPage'
import { WorkbenchPage } from './pages/WorkbenchPage'
import type { Change, QualityIssue, Suggestion } from './types'

type View = 'upload' | 'workbench'

function App() {
  const [view, setView] = useState<View>('upload')
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [filename, setFilename] = useState('')
  const [issues, setIssues] = useState<QualityIssue[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [dataRows, setDataRows] = useState<Record<string, unknown>[]>([])
  const [dataCols, setDataCols] = useState<string[]>([])
  const [changes, setChanges] = useState<Change[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  // ---------- Close dropdown on outside click ----------
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  // ---------- Backend health ----------
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        await apiHealthCheck()
        if (!cancelled) setBackendOk(true)
      } catch {
        if (!cancelled) setBackendOk(false)
      }
    }
    check()
    const id = setInterval(check, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  // ---------- Toast ----------
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 4000)
    return () => clearTimeout(t)
  }, [msg])

  // ---------- Projects ----------
  const loadProjects = useCallback(async () => {
    try {
      const { projects } = await fetchProjects()
      setProjects(projects)
    } catch {
      setProjects([])
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // ---------- Refresh active session ----------
  const refreshAll = useCallback(async (sid: string) => {
    const [q, s, d, c] = await Promise.all([
      fetchQuality(sid),
      fetchSuggestions(sid),
      fetchDataView(sid, 10000, 0),
      fetchChanges(sid).catch(() => ({ changes: [] })),
    ])
    setIssues(q.issues ?? [])
    setSuggestions(s.suggestions ?? [])
    setDataCols(d.columns ?? [])
    setDataRows(d.rows ?? [])
    setChanges(c.changes ?? [])
  }, [])

  // ---------- Open a project ----------
  const openProject = async (sid: string) => {
    const project = projects.find((p) => p.session_id === sid)
    setSessionId(sid)
    setFilename(project?.filename ?? '')
    setView('workbench')
    setMenuOpen(false)
    try {
      await refreshAll(sid)
    } catch {
      setMsg('Could not open project.')
      setView('upload')
    }
  }

  // ---------- Upload ----------
  const onUpload = async (file: File) => {
    setBusy(true)
    setMsg('')
    try {
      const result = await uploadFile(file)
      setSessionId(result.session_id)
      setFilename(result.filename)
      setMsg(`Loaded ${result.rows} rows × ${result.columns.length} columns`)
      await refreshAll(result.session_id)
      await loadProjects()
      setView('workbench')
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  // ---------- Delete project ----------
  const handleDeleteProject = async (sid: string) => {
    try {
      await deleteProject(sid)
      if (sid === sessionId) {
        setSessionId(null)
        setFilename('')
        setView('upload')
      }
      await loadProjects()
      setMsg('Project deleted.')
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  // ---------- Action runner ----------
  const runAction = useCallback(
    async <T,>(successMessage: string, fn: () => Promise<T>) => {
      if (!sessionId) return
      setBusy(true)
      try {
        await fn()
        setMsg(successMessage)
        await refreshAll(sessionId)
        await loadProjects()
      } catch (error) {
        setMsg(error instanceof Error ? error.message : 'Action failed')
      } finally {
        setBusy(false)
      }
    },
    [sessionId, refreshAll, loadProjects]
  )

  // ---------- Change log ----------
  const recordChange = useCallback(
    async (change: Omit<Change, 'id' | 'applied_at'>) => {
      if (!sessionId) return
      try {
        const saved = await recordChangeRemote(sessionId, change)
        setChanges((prev) => [...prev, saved])
      } catch {
        setChanges((prev) => [
          ...prev,
          {
            ...change,
            id: crypto.randomUUID(),
            applied_at: new Date().toISOString(),
          },
        ])
      }
    },
    [sessionId]
  )

  // ---------- Batch handlers ----------
  const handleApproveMany = (ids: string[]) => {
    const picked = suggestions.filter((s) => ids.includes(s.id))
    if (picked.length === 0) return
    runAction(
      `Approved ${picked.length} suggestion${picked.length === 1 ? '' : 's'}.`,
      async () => {
        for (const s of picked) {
          await applySuggestion(sessionId!, s.id, 'approve')
          await recordChange({
            action: 'approve_suggestion',
            rule_id: s.rule_id,
            column: s.column,
            description: `Applied: ${s.title}`,
          })
        }
      }
    )
  }

  const handleRejectMany = (ids: string[]) => {
    const picked = suggestions.filter((s) => ids.includes(s.id))
    if (picked.length === 0) return
    runAction(
      `Rejected ${picked.length} suggestion${picked.length === 1 ? '' : 's'}.`,
      async () => {
        for (const s of picked) {
          await applySuggestion(sessionId!, s.id, 'reject')
          await recordChange({
            action: 'reject_suggestion',
            rule_id: s.rule_id,
            column: s.column,
            description: `Rejected: ${s.title}`,
          })
        }
      }
    )
  }

  const handleRenameColumn = (from: string, to: string) => {
    if (!from || !to || from === to) return
    runAction(`Renamed “${from}” to “${to}”.`, async () => {
      await transformWorkingCopy(sessionId!, 'rename_column', from, to)
      await recordChange({
        action: 'rename_column',
        column: from,
        description: `Renamed “${from}” → “${to}”`,
        before: { sample: [from] },
        after: { sample: [to] },
      })
    })
  }

  const handleDropColumn = (column: string) =>
    runAction(`Dropped column “${column}”.`, async () => {
      await transformWorkingCopy(sessionId!, 'drop_column', column)
      await recordChange({
        action: 'drop_column',
        column,
        description: `Dropped column “${column}”`,
      })
    })

  const handleCellEdit = (rowIndex: number, column: string, value: string) => {
    const previous = dataRows[rowIndex]?.[column]
    setDataRows((prev) =>
      prev.map((r, i) => (i === rowIndex ? { ...r, [column]: value } : r))
    )
    void recordChange({
      action: 'edit_cell',
      column,
      description: `Edited row ${rowIndex + 1} in “${column}”`,
      before: { sample: [previous == null ? 'null' : String(previous)] },
      after: { sample: [value] },
    })
  }

  const handleExport = (format: 'csv' | 'xlsx') => {
    if (!sessionId) return
    window.location.href = exportDataUrl(sessionId, format)
  }

  const handleClearAudit = async () => {
    if (!sessionId) return
    try {
      await clearChangesRemote(sessionId)
    } catch {}
    setChanges([])
  }

  const handleUndo = async () => {
    if (!sessionId || changes.length === 0) return
    setBusy(true)
    try {
      await undoLast(sessionId)
      try {
        await popLastChange(sessionId)
      } catch {}
      setMsg('Reverted the most recent change.')
      await refreshAll(sessionId)
      await loadProjects()
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Undo failed')
    } finally {
      setBusy(false)
    }
  }

  // ---------- Render ----------
  const renderView = () => {
    if (view === 'workbench' && sessionId) {
      return (
        <WorkbenchPage
          sessionId={sessionId}
          filename={filename}
          columns={dataCols}
          rows={dataRows}
          suggestions={suggestions}
          issues={issues}
          changes={changes}
          busy={busy}
          onApprove={handleApproveMany}
          onReject={handleRejectMany}
          onRenameColumn={handleRenameColumn}
          onDropColumn={handleDropColumn}
          onCellEdit={handleCellEdit}
          onExport={handleExport}
          onClearAudit={handleClearAudit}
          onUndo={handleUndo}
          canUndo={changes.length > 0}
        />
      )
    }
    return <UploadPage busy={busy} filename={filename} onUpload={onUpload} />
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-cream-100 text-ink-900 antialiased">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-cream-300 bg-white px-5">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
      
          <div className="text-[15px] font-semibold tracking-tight text-ink-900">
            Data Qlean
          </div>
        </div>

        {/* Projects dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
              menuOpen
                ? 'bg-cream-200 text-ink-900'
                : 'text-ink-500 hover:bg-cream-200/70 hover:text-ink-700'
            }`}
          >
            Projects
            <span className="text-[9px] opacity-60">▾</span>
          </button>

          {menuOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 w-[320px] rounded-xl border-cream-300 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-cream-200 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
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
                        onClick={() => openProject(p.session_id)}
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
                            handleDeleteProject(p.session_id)
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

        {/* Add new project */}
        <button
          type="button"
          onClick={() => setView('upload')}
          className={`rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
            view === 'upload'
              ? 'bg-cream-200 text-ink-900'
              : 'text-ink-500 hover:bg-cream-200/70 hover:text-ink-700'
          }`}
        >
          + Add new project
        </button>

        {/* Status */}
        <div className="ml-auto flex items-center gap-3">
          {view === 'workbench' && sessionId && (
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

      <main className="min-h-0 flex-1 overflow-y-auto">
        {msg && view !== 'workbench' && (
          <div className="mx-auto w-full max-w-5xl px-5 pt-5 md:px-8">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
              <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>{msg}</span>
            </div>
          </div>
        )}
        <PageBoundary>{renderView()}</PageBoundary>
      </main>
    </div>
  )
}

function formatAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return date.toLocaleDateString()
}

export default App