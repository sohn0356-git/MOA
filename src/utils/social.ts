import type { Friendship, Visibility, Wallet } from '../types/social'

export const visitWindowMs = 1000 * 60 * 60 * 6

export function canViewContent(
  visibility: Visibility,
  ownerUid: string,
  viewerUid: string | null,
  isFriend: boolean,
) {
  if (visibility === 'public') {
    return true
  }

  if (!viewerUid) {
    return false
  }

  if (ownerUid === viewerUid) {
    return true
  }

  return visibility === 'friends' && isFriend
}

export function friendshipId(a: string, b: string) {
  return [a, b].sort().join('_')
}

export function isAcceptedFriend(friendship: Friendship | null | undefined) {
  return friendship?.status === 'accepted'
}

export function buildVisitKey(ownerUid: string, visitorUid: string, now = Date.now()) {
  const bucket = Math.floor(now / visitWindowMs)
  return `${ownerUid}_${visitorUid}_${bucket}`
}

export function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

export function canAfford(wallet: Wallet | null | undefined, price: number) {
  return Boolean(wallet && wallet.balance >= price)
}

export function nextBalance(wallet: Wallet, amount: number) {
  return wallet.balance + amount
}

export function sanitizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
}

export function isValidVisibility(value: string): value is Visibility {
  return ['public', 'friends', 'private'].includes(value)
}
