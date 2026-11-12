import {describe,it,expect,vi} from 'vitest'
const m=vi.hoisted(()=>({set:vi.fn()}))
vi.mock('firebase/auth',()=>({setPersistence:m.set,indexedDBLocalPersistence:'indexed',browserLocalPersistence:'local'}))
import {ensurePersistentAuth} from './authPersistence'
import type {Auth} from 'firebase/auth'
describe('durable authentication',()=>{
 it('shares preparation and prefers IndexedDB',async()=>{m.set.mockReset().mockResolvedValue(undefined);const auth={} as Auth;await Promise.all([ensurePersistentAuth(auth),ensurePersistentAuth(auth)]);expect(m.set).toHaveBeenCalledTimes(1);expect(m.set).toHaveBeenCalledWith(auth,'indexed')})
 it('uses local storage if IndexedDB is unavailable',async()=>{m.set.mockReset().mockRejectedValueOnce(new Error()).mockResolvedValue(undefined);const auth={} as Auth;await ensurePersistentAuth(auth);expect(m.set).toHaveBeenLastCalledWith(auth,'local')})
 it('reports storage failure and permits retry',async()=>{m.set.mockReset().mockRejectedValue(new Error());const auth={} as Auth;await expect(ensurePersistentAuth(auth)).rejects.toThrow('저장');m.set.mockResolvedValue(undefined);await expect(ensurePersistentAuth(auth)).resolves.toBeUndefined()})
})
