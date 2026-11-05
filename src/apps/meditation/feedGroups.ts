export const DEFAULT_FEED_GROUP = '미분류'
export function normalizeFeedGroup(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 40) : DEFAULT_FEED_GROUP
}
