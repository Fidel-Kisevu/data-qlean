import { useState } from 'react'
import { ChangeLogList } from './ChangeLogList'
import { ColumnProfiles } from './ColumnProfiles'
import { IssuesList } from './IssuesList'
import { SidebarTabs, type SidebarTab } from './SidebarTabs'
import { SuggestionCard } from './SuggestionCard'
import type { Change, Profile, QualityIssue } from '../../types'
import type { SuggestionGroup } from './workbench-utils'

export type WorkbenchRailProps = {
  groups: SuggestionGroup[]
  pendingCount: number
  changesCount: number
  activeGroupKey: string | null
  busy: boolean
  canUndo: boolean
  issues: QualityIssue[]
  profile: Profile | null
  onSelectGroup: (group: SuggestionGroup) => void
  onApprove: (ids: string[]) => void
  onReject: (ids: string[]) => void
  onHoverColumn: (col: string | null) => void
  onVariantApprove: (ids: string[]) => void
  onUndo?: () => void
  onClearAudit?: () => void
  changes: Change[]
}

export function WorkbenchRail({
  groups,
  pendingCount,
  changesCount,
  activeGroupKey,
  busy,
  canUndo,
  issues,
  profile,
  onSelectGroup,
  onApprove,
  onReject,
  onHoverColumn,
  onVariantApprove,
  onUndo,
  onClearAudit,
  changes,
}: WorkbenchRailProps) {
  const [tab, setTab] = useState<SidebarTab>('suggestions')

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-r border-cream-200 bg-white">
      <SidebarTabs
        active={tab}
        suggestionsCount={pendingCount}
        issuesCount={issues.length}
        changesCount={changesCount}
        onSelect={setTab}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'suggestions' && (
          <div className="space-y-2.5 bg-cream-50/60 p-3">
            {groups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-cream-300 bg-white px-4 py-10 text-center">
                <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-emerald-50">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 stroke-emerald-600"
                    fill="none"
                    strokeWidth="2.25"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-[13px] font-medium text-ink-800">Nothing to fix</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-500">
                  {changesCount > 0
                    ? `${changesCount} change${changesCount === 1 ? '' : 's'} applied below.`
                    : 'Upload a file to begin.'}
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <SuggestionCard
                  key={group.key}
                  group={group}
                  active={activeGroupKey === group.key}
                  busy={busy}
                  onSelect={() => onSelectGroup(group)}
                  onApprove={() => onApprove(group.suggestions.map((suggestion) => suggestion.id))}
                  onReject={() => onReject(group.suggestions.map((suggestion) => suggestion.id))}
                  onHoverColumn={onHoverColumn}
                  onVariantApprove={() => onVariantApprove(group.suggestions.map((suggestion) => suggestion.id))}
                />
              ))
            )}
          </div>
        )}

        {tab === 'issues' && <IssuesList issues={issues} onHoverColumn={onHoverColumn} />}

        {tab === 'changes' && (
          <ChangeLogList
            changes={changes}
            canUndo={canUndo}
            busy={busy}
            onUndo={onUndo}
            onClearAudit={onClearAudit}
          />
        )}

        {tab === 'profile' && <ColumnProfiles profile={profile} onHoverColumn={onHoverColumn} />}
      </div>
    </aside>
  )
}
