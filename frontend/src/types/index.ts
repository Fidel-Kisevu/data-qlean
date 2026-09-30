export type Severity = 'low' | 'medium' | 'high'
export type SuggestionStatus = 'pending' | 'approved' | 'rejected'

export type NavItemId =
  | 'upload'
  | 'dashboard'
  | 'data'
  | 'quality'
  | 'reconcile'
  | 'changes'
  | 'transform'
  | 'workbench'
  | 'export'

export type ProfileColumn = {
  dtype: string
  null_count: number
  null_pct: number
  unique_count: number
  sample_values: string[]
}

export type Profile = {
  row_count: number
  column_count: number
  columns: Record<string, ProfileColumn>
}

export type QualityIssue = {
  rule_id?: string
  type: string
  column?: string
  severity: Severity
  message: string
}

export type Suggestion = {
  id: string
  title: string
  description: string
  severity: Severity
  action_label: string
  status: SuggestionStatus
  column?: string
  rule_id?: string       // ← this was missing
}

export type DataViewResponse = {
  session_id: string
  total_rows: number
  offset: number
  limit: number
  columns: string[]
  rows: Record<string, unknown>[]
}

export type UploadResult = {
  session_id: string
  filename: string
  bytes: number
  rows: number
  columns: string[]
  status: string
  message: string
  created_at: string
}

export type SuggestionAction = 'approve' | 'reject'

export type AppMessage = {
  text: string
  tone?: 'success' | 'warning' | 'info'
}

// ---------- Changes ----------

export type ChangeAction =
  | 'approve_suggestion'
  | 'reject_suggestion'
  | 'rename_column'
  | 'drop_column'
  | 'edit_cell'

export type Change = {
  id: string
  action: ChangeAction
  rule_id?: string
  column?: string
  description: string
  applied_at: string
  before?: { sample: string[] }
  after?: { sample: string[] }
}