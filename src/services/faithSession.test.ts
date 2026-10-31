import { beforeEach, describe, expect, it, vi } from 'vitest'
const fixtures = vi.hoisted(() => ({
  primaryApp: { name: '[DEFAULT]', options: { projectId: 'moa' } },
  activityApp: { name: 'moa-faith-activity', options: { projectId: 'moa' } },
  primaryAuth: { currentUser: { uid: 'google-owner' } }, activityAuth: { currentUser: { uid: 'ai03' } },
  primaryDb: { name: 'primary-db' }, primaryStorage: { name: 'primary-storage' },
  database: vi.fn(), storage: vi.fn(),
}))
vi.mock('./firebase', () => ({
  getFirebaseApp: () => fixtures.primaryApp, getFirebaseAuth: () => fixtures.primaryAuth,
  getRealtimeDb: () => fixtures.primaryDb, getFirebaseStorage: () => fixtures.primaryStorage,
}))
vi.mock('firebase/app', () => ({ getApps: () => [fixtures.primaryApp, fixtures.activityApp], initializeApp: vi.fn() }))
vi.mock('firebase/auth', () => ({ getAuth: () => fixtures.activityAuth }))
vi.mock('firebase/database', () => ({ getDatabase: fixtures.database, ref: () => ({ toString: () => 'https://moa-default-rtdb.firebaseio.com/' }) }))
vi.mock('firebase/storage', () => ({ getStorage: fixtures.storage }))
import { getFaithAuth, getFaithDb, getFaithStorage, setFaithAiActivity } from './faithSession'
beforeEach(() => { vi.clearAllMocks(); setFaithAiActivity(false) })
describe('separate Faith activity permissions', () => {
  it('uses the selected AI auth, database and storage app without replacing the Google session', () => {
    expect(getFaithAuth()).toBe(fixtures.primaryAuth)
    setFaithAiActivity(true)
    expect(getFaithAuth().currentUser?.uid).toBe('ai03')
    getFaithDb(); getFaithStorage()
    expect(fixtures.database).toHaveBeenCalledWith(fixtures.activityApp, 'https://moa-default-rtdb.firebaseio.com/')
    expect(fixtures.storage).toHaveBeenCalledWith(fixtures.activityApp)
    expect(fixtures.primaryAuth.currentUser.uid).toBe('google-owner')
    setFaithAiActivity(false)
    expect(getFaithAuth()).toBe(fixtures.primaryAuth)
    expect(getFaithDb()).toBe(fixtures.primaryDb)
    expect(getFaithStorage()).toBe(fixtures.primaryStorage)
  })
})
