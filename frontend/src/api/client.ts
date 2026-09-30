import type { Change, DataViewResponse, Profile, QualityIssue, Suggestion, SuggestionAction, UploadResult } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers ?? {}),
    },
  })

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const detail = typeof payload === 'string' ? payload : payload?.detail ?? 'Request failed'
    throw new Error(detail)
  }

  return payload as T
}

export const apiHealthCheck = () => request<{ status: string }>('/health')

export const uploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  return request<UploadResult>('/upload', {
    method: 'POST',
    body: formData,
  })
}

export const fetchProfile = (sessionId: string) =>
  request<{ session_id: string; status: string } & Profile>(`/profile/${sessionId}`)

export const fetchQuality = (sessionId: string) =>
  request<{ session_id: string; status: string; count: number; by_severity: Record<string, number>; issues: QualityIssue[] }>(`/quality/${sessionId}`)

export const fetchSuggestions = (sessionId: string) =>
  request<{ session_id: string; status: string; count: number; suggestions: Suggestion[] }>(`/suggestions/${sessionId}`)

export const applySuggestion = (sessionId: string, suggestionId: string, action: SuggestionAction) =>
  request<{ session_id: string; suggestion_id: string; action: SuggestionAction; status: string; rows?: number; columns?: string[] }>(`/suggestions/${sessionId}/${suggestionId}`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })

export const fetchDataView = (sessionId: string, limit = 50, offset = 0) =>
  request<DataViewResponse>(`/data/${sessionId}?limit=${limit}&offset=${offset}`)

export const transformWorkingCopy = (sessionId: string, action: 'rename_column' | 'drop_column', column: string, newName?: string) =>
  request<{ session_id: string; status: string; action: string; rows: number; columns: string[] }>(`/transform/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ action, column, new_name: newName }),
  })

export const exportDataUrl = (sessionId: string, format: 'csv' | 'xlsx') =>
  `${API_BASE}/export/${sessionId}?format=${format}`

// ---------- Changes (audit trail) ----------

export type ChangePayload = {
  action: string
  rule_id?: string
  column?: string
  description: string
  before?: { sample: string[] }
  after?: { sample: string[] }
}

export const fetchChanges = (sessionId: string) =>
  request<{ session_id: string; changes: Change[] }>(`/changes/${sessionId}`)

export const recordChangeRemote = (sessionId: string, payload: ChangePayload) =>
  request<Change>(`/changes/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const clearChangesRemote = (sessionId: string) =>
  request<{ ok: boolean }>(`/changes/${sessionId}`, {
    method: 'DELETE',
  })

export const popLastChange = (sessionId: string) =>
  request<{ removed: unknown; remaining: number }>(
    `/changes/${sessionId}/last`,
    { method: 'DELETE' }
  )

// ---------- Undo ----------

export const canUndo = (sessionId: string) =>
  request<{ session_id: string; can_undo: boolean; depth: number }>(
    `/undo/${sessionId}/can-undo`
  )

export const undoLast = (sessionId: string) =>
  request<{
    session_id: string
    restored_from: string
    remaining_undo: number
  }>(`/undo/${sessionId}`, { method: 'POST' })

// ---------- Projects ----------

export type ProjectMeta = {
  session_id: string
  filename: string
  rows: number
  columns: string[]
  bytes: number | null
  created_at: string
  updated_at: string
}

export const fetchProjects = () =>
  request<{ projects: ProjectMeta[] }>('/projects')

export const fetchProject = (sessionId: string) =>
  request<ProjectMeta>(`/projects/${sessionId}`)

export const deleteProject = (sessionId: string) =>
  request<{ ok: boolean; deleted: string }>(`/projects/${sessionId}`, {
    method: 'DELETE',
  })