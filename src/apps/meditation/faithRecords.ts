export function mergeFaithRecords<T extends { id: string; createdAt?: string }>(stored: T[], examples: T[]) {
  const savedIds = new Set(stored.map(item => item.id))
  return [...stored, ...examples.filter(item => !savedIds.has(item.id))]
    .sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0))
}
