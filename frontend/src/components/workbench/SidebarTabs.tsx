export type SidebarTab = 'suggestions' | 'issues' | 'changes' | 'profile'

type SidebarTabsProps = {
  active: SidebarTab
  suggestionsCount: number
  issuesCount: number
  changesCount: number
  onSelect: (tab: SidebarTab) => void
}

const TABS: Array<{ id: SidebarTab; label: string }> = [
  { id: 'suggestions', label: 'Suggestions' },
  { id: 'issues', label: 'Issues' },
  { id: 'changes', label: 'Changes' },
  { id: 'profile', label: 'Profile' },
]

export function SidebarTabs({
  active,
  suggestionsCount,
  issuesCount,
  changesCount,
  onSelect,
}: SidebarTabsProps) {
  const counts: Record<SidebarTab, number> = {
    suggestions: suggestionsCount,
    issues: issuesCount,
    changes: changesCount,
    profile: 0,
  }

  return (
    <div className="flex shrink-0 items-center gap-4 border-b border-cream-200 bg-white px-4">
      {TABS.map((tab) => {
        const isActive = active === tab.id
        const count = counts[tab.id]
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`relative flex items-center gap-1.5 py-3 text-[12.5px] font-medium transition-colors ${
              isActive
                ? 'text-ink-900'
                : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            <span className="truncate">{tab.label}</span>
            {count > 0 && (
              <span
                className={`shrink-0 font-mono text-[10.5px] tabular-nums ${
                  isActive ? 'text-ink-500' : 'text-ink-400'
                }`}
              >
                {count > 99 ? '99+' : count}
              </span>
            )}

            {/* Underline indicator */}
            {isActive && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-accent" />
            )}
          </button>
        )
      })}
    </div>
  )
}