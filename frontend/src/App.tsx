import { useCallback, useEffect, useRef, useState } from 'react'
import { ReplaceDialog } from './components/workbench/ReplaceDialog'
import {
  apiHealthCheck,
  applyColumnAction,
  applySuggestion,
  clearChangesRemote,
  deleteProject,
  exportDataUrl,
  fetchChanges,
  fetchDataView,
  fetchFlags,
  fetchOriginal,
  fetchProfile,
  fetchProjects,
  fetchQuality,
  fetchSuggestions,
  popLastChange,
  recordChangeRemote,
  resetWorkingCopy,
  transformWorkingCopy,
  undoLast,
  uploadFile,
  type CellFlag,
  type ProjectMeta,
} from './api/client'

import { AppHeader } from './components/ui/AppHeader'
import { PageBoundary } from './components/ui/PageBoundary'
import { UploadPage } from './pages/UploadPage'
import { WorkbenchPage } from './pages/WorkbenchPage'
import { CleanPage } from './pages/CleanPage'
import { PreviewPage } from './pages/PreviewPage'
import type { Change, Profile, QualityIssue, Suggestion } from './types'

type View = 'upload' | 'workbench' | 'clean' | 'preview'

function App() {
  const [view, setView] = useState<View>('upload')
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const toolsMenuRef = useRef<HTMLDivElement>(null)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [filename, setFilename] = useState('')
  const [issues, setIssues] = useState<QualityIssue[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [dataRows, setDataRows] = useState<Record<string, unknown>[]>([])
  const [dataCols, setDataCols] = useState<string[]>([])
  const [changes, setChanges] = useState<Change[]>([])
  const [flags, setFlags] = useState<CellFlag[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [toolsDialog, setToolsDialog] = useState<'replace' | 'regex' | null>(null)

  // Preview / original
  const [originalFilename, setOriginalFilename] = useState<string | null>(null)
  const [originalColumns, setOriginalColumns] = useState<string[]>([])
  const [originalRows, setOriginalRows] = useState<Record<string, unknown>[]>([])
  const [originalTotalRows, setOriginalTotalRows] = useState(0)
  const [originalFileSize, setOriginalFileSize] = useState<number | null>(null)
  const [originalLoading, setOriginalLoading] = useState(false)

  // ---------- Close dropdown on outside click ----------
  useEffect(() => {
    if (!menuOpen && !toolsMenuOpen) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuOpen && menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false)
      }
      if (toolsMenuOpen && toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setToolsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen, toolsMenuOpen])

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
    const [q, s, d, c, f, p] = await Promise.all([
      fetchQuality(sid),
      fetchSuggestions(sid),
      fetchDataView(sid, 10000, 0),
      fetchChanges(sid).catch(() => ({ changes: [] })),
      fetchFlags(sid).catch(() => ({ flags: [] })),
      fetchProfile(sid).catch(() => null),
    ])
    setIssues(q.issues ?? [])
    setSuggestions(s.suggestions ?? [])
    setDataCols(d.columns ?? [])
    setDataRows(d.rows ?? [])
    setChanges(c.changes ?? [])
    setFlags(f.flags ?? [])
    setProfile(p)
  }, [])

  // ---------- Load original (preview) ----------
  const loadOriginal = useCallback(async (sid: string) => {
    setOriginalLoading(true)
    try {
      const data = await fetchOriginal(sid, 5000, 0)
      setOriginalFilename(data.filename)
      setOriginalColumns(data.columns)
      setOriginalRows(data.rows)
      setOriginalTotalRows(data.total_rows)
      setOriginalFileSize(data.file_size_bytes)
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Failed to load original')
      setOriginalColumns([])
      setOriginalRows([])
    } finally {
      setOriginalLoading(false)
    }
  }, [])

  useEffect(() => {
    if (view === 'preview' && sessionId) {
      loadOriginal(sessionId)
    }
  }, [view, sessionId, loadOriginal])

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

  // ---------- Column action menu handler ----------
  const handleColumnAction = (
    column: string,
    action: string,
    params?: Record<string, unknown>
  ) =>
    runAction(
      `Applied ${action.replace(/_/g, ' ')} to “${column}”.`,
      async () => {
        await applyColumnAction(sessionId!, column, action, params)
        await recordChange({
          action: 'rename_column',
          column,
          description: `Applied ${action.replace(/_/g, ' ')} to “${column}”`,
        })
      }
    )

  // ---------- Clean page handlers ----------
  const handleReorderColumns = (order: string[]) =>
    runAction('Columns reordered.', async () => {
      await transformWorkingCopy(sessionId!, 'reorder_columns', undefined, undefined, {
        order,
      })
      await recordChange({
        action: 'rename_column',
        description: `Reordered ${order.length} columns`,
      })
    })

  const handleSort = (column: string, ascending: boolean) =>
    runAction(
      `Sorted by "${column}" ${ascending ? 'ascending' : 'descending'}.`,
      async () => {
        await transformWorkingCopy(sessionId!, 'sort', column, undefined, { ascending })
        await recordChange({
          action: 'rename_column',
          column,
          description: `Sorted by "${column}" ${ascending ? '↑' : '↓'}`,
        })
      }
    )

  const handleDeleteRows = (indices: number[]) =>
    runAction(
      `Deleted ${indices.length} row${indices.length === 1 ? '' : 's'}.`,
      async () => {
        await transformWorkingCopy(sessionId!, 'delete_rows', undefined, undefined, {
          indices,
        })
        await recordChange({
          action: 'rename_column',
          description: `Deleted ${indices.length} row${indices.length === 1 ? '' : 's'}`,
        })
      }
    )

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

  const handleResetToOriginal = async () => {
    if (!sessionId) return
    setBusy(true)
    try {
      await resetWorkingCopy(sessionId)
      setMsg('Reset to the original file.')
      await refreshAll(sessionId)
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  const handleCopyChangeLog = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(changes, null, 2))
      setMsg('Change log copied to clipboard.')
    } catch {
      setMsg('Copy failed — clipboard is unavailable.')
    }
  }

 const handleToolsDialog = (kind: 'replace' | 'regex' | 'rename' | 'drop' | 'reorder') => {
  if (kind === 'replace' || kind === 'regex') {
    setToolsDialog(kind)
    return
  }
  if (kind === 'rename') {
    setMsg('Rename: right-click a column header to rename a specific column.')
    return
  }
  if (kind === 'drop') {
    setMsg('Drop: right-click a column header to drop a specific column.')
    return
  }
  setMsg('Reorder: open the Clean page and drag a column header.')
}

const handleToolsAction = (action: string, params?: Record<string, unknown>) => {
  if (!sessionId) return

  if (action === 'drop_duplicates_keep_first') {
    if (!confirm('Remove duplicate rows? This keeps the first occurrence of each duplicate.')) return
    runAction('Removed duplicate rows.', async () => {
      await applyColumnAction(sessionId, null, action, params)
      await recordChange({
        action: 'rename_column',
        description: 'Removed duplicate rows',
      })
    })
    return
  }

  if (action === 'drop_empty_rows') {
    if (!confirm('Remove all completely empty rows?')) return
    runAction('Removed empty rows.', async () => {
      await applyColumnAction(sessionId, null, action, params)
      await recordChange({
        action: 'rename_column',
        description: 'Removed empty rows',
      })
    })
    return
  }

  setMsg(`Unknown tool action: ${action}`)
}

const handleToolsReplaceApply = (params: Record<string, unknown>) => {
  if (!sessionId || !toolsDialog) return
  const action = toolsDialog === 'replace' ? 'replace_value_all' : 'regex_replace_all'
  const label = toolsDialog === 'replace' ? 'find & replace' : 'regex replace'
  runAction(`Applied ${label} across all columns.`, async () => {
    await applyColumnAction(sessionId, null, action, params)
    await recordChange({
      action: 'rename_column',
      description: `Applied ${label} across all columns`,
    })
  })
  setToolsDialog(null)
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
          profile={profile}
          changes={changes}
          flags={flags}
          busy={busy}
          onApprove={handleApproveMany}
          onReject={handleRejectMany}
          onRenameColumn={handleRenameColumn}
          onDropColumn={handleDropColumn}
          onCellEdit={handleCellEdit}
          onColumnAction={handleColumnAction}
          onExport={handleExport}
          onClearAudit={handleClearAudit}
          onUndo={handleUndo}
          canUndo={changes.length > 0}
        />
      )
    }

    if (view === 'clean' && sessionId) {
      return (
        <CleanPage
          sessionId={sessionId}
          filename={filename}
          columns={dataCols}
          rows={dataRows}
          changes={changes}
          suggestions={suggestions}
          busy={busy}
          onReorderColumns={handleReorderColumns}
          onSort={handleSort}
          onRenameColumn={handleRenameColumn}
          onDropColumn={handleDropColumn}
          onCellEdit={handleCellEdit}
          onColumnAction={handleColumnAction}
          onExport={handleExport}
          onDeleteRows={handleDeleteRows}
        />
      )
    }

    if (view === 'preview' && sessionId) {
      return (
        <PreviewPage
          sessionId={sessionId}
          filename={filename}
          originalFilename={originalFilename}
          fileSizeBytes={originalFileSize}
          columns={originalColumns}
          rows={originalRows}
          totalRows={originalTotalRows}
          loading={originalLoading}
          onBack={() => setView('workbench')}
        />
      )
    }

    return <UploadPage busy={busy} filename={filename} onUpload={onUpload} />
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-cream-100 text-ink-900 antialiased">
      <AppHeader
        view={view}
        projects={projects}
        sessionId={sessionId}
        filename={filename}
        backendOk={backendOk}
        menuOpen={menuOpen}
        menuRef={menuRef}
        toolsMenuOpen={toolsMenuOpen}
        toolsMenuRef={toolsMenuRef}
        busy={busy}
        columns={dataCols}
        onToggleMenu={() => setMenuOpen((v) => !v)}
        onToggleToolsMenu={() => setToolsMenuOpen((v) => !v)}
        onOpenProject={openProject}
        onDeleteProject={handleDeleteProject}
        onSetView={setView}
        onAddNewProject={() => setView('upload')}
        onCloseToolsMenu={() => setToolsMenuOpen(false)}
        onToolsDialog={handleToolsDialog}
        onToolsAction={handleToolsAction}
        onResetToOriginal={handleResetToOriginal}
        onCopyChangeLog={handleCopyChangeLog}
      />

      <main className="min-h-0 flex-1 overflow-y-auto">
        {msg && view !== 'workbench' && view !== 'clean' && view !== 'preview' && (
          <div className="mx-auto w-full max-w-5xl px-5 pt-5 md:px-8">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
              <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>{msg}</span>
            </div>
          </div>
        )}
        <PageBoundary>{renderView()}</PageBoundary>
      </main>
      {toolsDialog && (
  <ReplaceDialog
    column={null}
    mode={toolsDialog === 'regex' ? 'regex' : 'plain'}
    busy={busy}
    onClose={() => setToolsDialog(null)}
    onApply={handleToolsReplaceApply}
  />
)}
    </div>
  )
}

export default App