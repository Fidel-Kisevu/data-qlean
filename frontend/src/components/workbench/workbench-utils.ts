import type { Suggestion } from '../../types'

export type SuggestionGroup = {
  key: string
  rule_id: string
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  suggestions: Suggestion[]
  columns: string[]
}

export function groupSuggestions(suggestions: Suggestion[]): SuggestionGroup[] {
  const map = new Map<string, Suggestion[]>()
  for (const suggestion of suggestions) {
    const key = suggestion.rule_id ?? suggestion.title
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(suggestion)
  }

  return Array.from(map.entries())
    .map(([key, group]) => {
      const first = group[0]
      return {
        key,
        rule_id: key,
        severity: first.severity,
        title: simplifyTitle(first.title, group.length),
        description: first.description.split(' Column ')[0],
        suggestions: group,
        columns: group.map((suggestion) => suggestion.column).filter((column): column is string => !!column),
      }
    })
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
}

export const severityRank = (severity: string) =>
  severity === 'high' ? 0 : severity === 'medium' ? 1 : 2

export function simplifyTitle(title: string, count: number): string {
  if (count === 1) return title
  return title.replace(/['"][^'"]+['"]/g, '').replace(/\s+/g, ' ').trim()
}

export const severityCellClass = (severity: string) => {
  if (severity === 'high') return 'bg-rose-50 shadow-[inset_2px_0_0_#E11D48]'
  if (severity === 'medium') return 'bg-amber-50 shadow-[inset_2px_0_0_#D97706]'
  return 'bg-sky-50 shadow-[inset_2px_0_0_#0284C7]'
}
