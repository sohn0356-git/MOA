export type SuggestionFilter = 'all' | 'open' | 'done'
export type SuggestionOrder = 'newest' | 'oldest'

export function selectSuggestions<T extends { id: string; isCompleted: boolean; createdAt: number }>(
  suggestions: T[], filter: SuggestionFilter, order: SuggestionOrder,
): T[] {
  return suggestions
    .filter((item) => filter === 'all' || (filter === 'done' ? item.isCompleted : !item.isCompleted))
    .sort((a, b) => (order === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt) || a.id.localeCompare(b.id))
}
