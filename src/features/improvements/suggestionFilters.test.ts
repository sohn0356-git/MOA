import { describe, expect, it } from 'vitest'
import { selectSuggestions, type SuggestionFilter, type SuggestionOrder } from './suggestionFilters'

describe('suggestion status and order', () => {
  const items = [
    { id: 'a', createdAt: 1, isCompleted: false },
    { id: 'b', createdAt: 2, isCompleted: true },
    { id: 'c', createdAt: 3, isCompleted: false },
    { id: 'd', createdAt: 4, isCompleted: true },
  ]
  it.each([
    ['all', 'newest', ['d', 'c', 'b', 'a']],
    ['all', 'oldest', ['a', 'b', 'c', 'd']],
    ['open', 'newest', ['c', 'a']],
    ['open', 'oldest', ['a', 'c']],
    ['done', 'newest', ['d', 'b']],
    ['done', 'oldest', ['b', 'd']],
  ])('filters %s and sorts %s', (filter, order, expected) => {
    expect(selectSuggestions(items, filter as SuggestionFilter, order as SuggestionOrder).map(item => item.id)).toEqual(expected)
    expect(items.map(item => item.id)).toEqual(['a', 'b', 'c', 'd'])
  })
  it('handles empty filtered lists and updated completion states', () => {
    expect(selectSuggestions([], 'open', 'newest')).toEqual([])
    const updated = items.map(item => ({ ...item, isCompleted: true }))
    expect(selectSuggestions(updated, 'open', 'newest')).toEqual([])
    expect(selectSuggestions(updated, 'done', 'newest')).toHaveLength(4)
  })
})
