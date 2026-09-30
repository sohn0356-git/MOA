import { describe, expect, it } from 'vitest'
import { buildVisitKey, canAfford, canViewContent, friendshipId, sanitizeUsername, todayKey } from './social'

describe('social privacy and identifiers', () => {
  it('allows public content and protects private content', () => {
    expect(canViewContent('public', 'owner', null, false)).toBe(true)
    expect(canViewContent('private', 'owner', null, false)).toBe(false)
    expect(canViewContent('private', 'owner', 'owner', false)).toBe(true)
  })

  it('allows friend-only content only to owner or accepted friends', () => {
    expect(canViewContent('friends', 'owner', 'visitor', false)).toBe(false)
    expect(canViewContent('friends', 'owner', 'visitor', true)).toBe(true)
    expect(canViewContent('friends', 'owner', 'owner', false)).toBe(true)
  })

  it('creates stable friendship ids independent of direction', () => {
    expect(friendshipId('b', 'a')).toBe('a_b')
    expect(friendshipId('a', 'b')).toBe('a_b')
  })

  it('deduplicates visit keys by time window bucket', () => {
    const first = buildVisitKey('owner', 'visitor', 1000)
    const second = buildVisitKey('owner', 'visitor', 1000 * 60)
    expect(first).toBe(second)
  })

  it('normalizes usernames for prefix search and reservation', () => {
    expect(sanitizeUsername(' My-Room!! ')).toBe('myroom')
  })

  it('calculates date keys and wallet affordability', () => {
    expect(todayKey(new Date('2026-09-30T12:00:00.000Z'))).toBe('2026-09-30')
    expect(canAfford({ userId: 'u1', balance: 10, updatedAt: 1 }, 9)).toBe(true)
    expect(canAfford({ userId: 'u1', balance: 10, updatedAt: 1 }, 11)).toBe(false)
  })
})
