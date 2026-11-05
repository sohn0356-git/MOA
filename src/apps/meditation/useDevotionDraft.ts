import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { normalizeDevotionFields } from './devotionEditing'
import { normalizeFeedGroup } from './feedGroups'
import { BEFORE_APP_UPDATE } from '../../lib/appUpdateProtocol'

export type DraftValues = ReturnType<typeof normalizeDevotionFields> & { groupName: string }
export type DevotionDraft = { version: 1; id: string; tab: string; owner: string; updatedAt: number; mode: 'write' | 'edit'; entryId: string; source?: Record<string, unknown>; values: DraftValues }
export type DraftContent = Pick<DevotionDraft, 'mode' | 'entryId' | 'source' | 'values'>
export const DEVOTION_DRAFT_PREFIX = 'moa.faith.devotionDraft.v1:'
const tabId = () => {
  try {
    let id = sessionStorage.getItem('moa.faith.draftTab')
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('moa.faith.draftTab', id) }
    return id
  } catch { return crypto.randomUUID() }
}
export function hasDraftContent(value: DraftContent) {
  return Boolean(value.values.mind.trim() || value.values.apply.trim() || value.values.prayer.trim() || value.values.crossImage || value.values.selectedVerseNumbers.length)
}
export function parseDevotionDraft(raw: string | null, owner: string): DevotionDraft | null {
  try {
    const d = JSON.parse(raw || 'null')
    if (!d || d.version !== 1 || d.owner !== owner || typeof d.id !== 'string' || typeof d.tab !== 'string' || !Number.isFinite(d.updatedAt) || !['write', 'edit'].includes(d.mode) || !d.values || typeof d.values !== 'object') return null
    const values = { ...normalizeDevotionFields(d.values, new Date().toISOString().slice(0, 10)), groupName: normalizeFeedGroup(d.values.groupName) }
    const result: DevotionDraft = { version: 1, id: d.id, tab: d.tab, owner, updatedAt: d.updatedAt, mode: d.mode, entryId: typeof d.entryId === 'string' ? d.entryId : '', source: d.source && typeof d.source === 'object' ? d.source : undefined, values }
    return hasDraftContent(result) ? result : null
  } catch { return null }
}
export function useDevotionDraft(owner: string, active: boolean, value: DraftContent, preparing = false) {
  const prefix = DEVOTION_DRAFT_PREFIX + encodeURIComponent(owner) + ':'
  const pointer = 'moa.faith.draftPointer:' + owner
  const tab = useRef(tabId())
  const currentId = useRef('')
  const ownedIds = useRef(new Set<string>())
  const suppressed = useRef(false)
  const lastSaved = useRef('')
  const restoredFrom = useRef<{ key: string; raw: string | null } | null>(null)
  const latest = useRef({ owner, active, value, preparing })
  latest.current = { owner, active, value, preparing }
  const [drafts, setDrafts] = useState<DevotionDraft[]>([])
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const refresh = useCallback(() => {
    try {
      const list: DevotionDraft[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(prefix)) { const draft = parseDevotionDraft(localStorage.getItem(key), owner); if (draft) list.push(draft) }
      }
      setDrafts(list.sort((a, b) => b.updatedAt - a.updatedAt))
    } catch { setError('임시저장 공간을 읽지 못했습니다. 브라우저 저장 설정을 확인해주세요.') }
  }, [owner, prefix])
  useLayoutEffect(() => {
    currentId.current = ''
    try { currentId.current = sessionStorage.getItem(pointer) || '' } catch { /* A fresh draft still gets a unique ID. */ }
    suppressed.current = false; lastSaved.current = ''; restoredFrom.current = null; setSavedAt(null); setError(''); refresh()
  }, [pointer, refresh])
  const flush = useCallback((patch?: Partial<DraftValues>) => {
    const state = latest.current
    if (!state.active || state.owner !== owner || suppressed.current) return true
    const content = patch ? { ...state.value, values: { ...state.value.values, ...patch } } : state.value
    if (patch) latest.current = { ...state, value: content }
    if (!hasDraftContent(content)) return true
    if (!currentId.current || !ownedIds.current.has(currentId.current)) { currentId.current = crypto.randomUUID(); ownedIds.current.add(currentId.current) }
    const serializedContent = JSON.stringify(content)
    if (lastSaved.current === serializedContent) return true
    const draft: DevotionDraft = { ...content, version: 1, id: currentId.current, tab: tab.current, owner, updatedAt: Date.now() }
    try {
      localStorage.setItem(prefix + draft.id, JSON.stringify(draft))
      try { sessionStorage.setItem(pointer, draft.id) } catch { /* Draft is still durable in local storage. */ }
      lastSaved.current = serializedContent
      setSavedAt(draft.updatedAt); setError(''); setDrafts(previous => [draft, ...previous.filter(item => item.id !== draft.id)]); return true
    } catch {
      setError('임시저장에 실패했습니다. 저장 공간을 확보하거나 묵상을 저장하기 전에는 이 화면을 닫지 마세요.')
      return false
    }
  }, [owner, prefix, pointer, refresh])
  const serialized = JSON.stringify(value)
  useLayoutEffect(() => { if (active) flush() }, [active, serialized, flush])
  useEffect(() => {
    const update = (event: Event) => {
      const state = latest.current
      const saved = flush()
      if (state.active && (hasDraftContent(state.value) || state.preparing)) {
        event.preventDefault()
        if (saved) setError('작성 중인 묵상은 임시저장했습니다. 저장하거나 작성 화면을 닫은 뒤 업데이트해주세요.')
      }
    }
    const unload = (event: BeforeUnloadEvent) => {
      flush()
      const state = latest.current
      if (state.active && (hasDraftContent(state.value) || state.preparing)) { event.preventDefault(); event.returnValue = '' }
    }
    const hide = () => { flush() }
    const storage = (event: StorageEvent) => { if (event.key?.startsWith(prefix)) refresh() }
    window.addEventListener(BEFORE_APP_UPDATE, update); window.addEventListener('beforeunload', unload)
    window.addEventListener('pagehide', hide); document.addEventListener('visibilitychange', hide); window.addEventListener('storage', storage)
    return () => {
      window.removeEventListener(BEFORE_APP_UPDATE, update); window.removeEventListener('beforeunload', unload)
      window.removeEventListener('pagehide', hide); document.removeEventListener('visibilitychange', hide); window.removeEventListener('storage', storage)
    }
  }, [flush, prefix, refresh])
  function activate(draft?: DevotionDraft) {
    restoredFrom.current = null
    if (draft) {
      try { restoredFrom.current = { key: prefix + draft.id, raw: localStorage.getItem(prefix + draft.id) } } catch { /* Keep the original backup if inaccessible. */ }
    }
    currentId.current = draft && ownedIds.current.has(draft.id) ? draft.id : crypto.randomUUID()
    ownedIds.current.add(currentId.current)
    suppressed.current = false; lastSaved.current = ''; setError('')
    try { sessionStorage.setItem(pointer, currentId.current) } catch { /* The local draft remains readable. */ }
  }
  function clear() {
    if (latest.current.owner !== owner) return
    suppressed.current = true
    try {
      if (currentId.current) localStorage.removeItem(prefix + currentId.current)
      const original = restoredFrom.current
      if (original && localStorage.getItem(original.key) === original.raw) localStorage.removeItem(original.key)
      restoredFrom.current = null
      sessionStorage.removeItem(pointer); refresh(); setSavedAt(null)
    }
    catch { setError('임시저장 정리에 실패했습니다. 게시한 내용은 저장됐습니다.') }
  }
  function discard(id: string) {
    try { localStorage.removeItem(prefix + id); if (id === currentId.current) { suppressed.current = true; currentId.current = '' }; refresh() }
    catch { setError('임시저장을 삭제하지 못했습니다.') }
  }
  return { drafts, error, savedAt, flush, activate, clear, discard }
}
