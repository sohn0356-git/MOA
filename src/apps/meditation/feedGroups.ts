export const DEFAULT_FEED_GROUP = '전체 공개'
export function normalizeFeedGroup(value: unknown) {
  const name = typeof value === 'string' ? value.trim().slice(0, 40) : ''
  return !name || name === '미분류' ? DEFAULT_FEED_GROUP : name
}
