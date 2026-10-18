import { useEffect, useRef, useState } from 'react'
export const draftStorageKey = (uid: string) => 'moa.suggestions.draft.v1:' + encodeURIComponent(uid)
type Draft = { title: string; body: string; savedAt: number }
type State = { uid: string; title: string; body: string; savedAt: number | null; candidate: Draft | null; unsaved: boolean; error: string }
function load(uid: string): State {
  const state: State = { uid, title: '', body: '', savedAt: null, candidate: null, unsaved: false, error: '' }
  if (!uid) return state
  try {
    const value: unknown = JSON.parse(localStorage.getItem(draftStorageKey(uid)) || 'null')
    if (value && typeof value === 'object' && 'title' in value && 'body' in value && 'savedAt' in value &&
      typeof value.title === 'string' && typeof value.body === 'string' && typeof value.savedAt === 'number' &&
      Number.isFinite(value.savedAt) && (value.title || value.body)) {
      state.candidate = { title: value.title.slice(0, 80), body: value.body.slice(0, 1200), savedAt: value.savedAt }
    }
  } catch { state.error = '초안을 불러오지 못했습니다. 이 브라우저의 저장 공간을 확인해 주세요.' }
  return state
}
export function requestDraftNavigation() {
  return window.dispatchEvent(new Event('moa:before-navigation', { cancelable: true }))
}
export function useSuggestionDraft(uid: string) {
  const [state, setState] = useState(() => load(uid))
  const current = state.uid === uid ? state : { ...state, uid, title: '', body: '', savedAt: null, candidate: null, unsaved: false, error: '' }
  const latest = useRef(current)
  latest.current = current
  useEffect(() => { if (state.uid !== uid) setState(load(uid)) }, [uid, state.uid])
  useEffect(() => {
    const confirmLeave = () => !latest.current.unsaved || window.confirm('저장되지 않은 작성 내용이 있습니다. 화면을 나갈까요?')
    const beforeNavigate = (event: Event) => { if (!confirmLeave()) event.preventDefault() }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!latest.current.unsaved) return
      event.preventDefault(); event.returnValue = ''
    }
    let previousUrl = window.location.href
    const hashChange = (event: HashChangeEvent) => {
      if (!event.oldURL) { previousUrl = window.location.href; return }
      if (!confirmLeave()) {
        event.stopImmediatePropagation()
        history.replaceState(null, '', previousUrl)
      } else previousUrl = window.location.href
    }
    window.addEventListener('moa:before-navigation', beforeNavigate)
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('hashchange', hashChange, true)
    return () => {
      window.removeEventListener('moa:before-navigation', beforeNavigate)
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('hashchange', hashChange, true)
    }
  }, [])
  function change(patch: Partial<Pick<Draft, 'title' | 'body'>>) {
    const next: State = { ...latest.current, ...patch, candidate: null, unsaved: true, error: '' }
    next.title = next.title.slice(0, 80); next.body = next.body.slice(0, 1200)
    try {
      if (!uid) throw new Error('No account')
      if (next.title || next.body) {
        const savedAt = Date.now()
        localStorage.setItem(draftStorageKey(uid), JSON.stringify({ title: next.title, body: next.body, savedAt }))
        next.savedAt = savedAt
      } else {
        localStorage.removeItem(draftStorageKey(uid)); next.savedAt = null
      }
      next.unsaved = false
    } catch { next.error = '초안 자동 저장에 실패했습니다. 이 화면을 나가기 전에 저장을 다시 시도해 주세요.' }
    latest.current = next; setState(next)
  }
  function resume() {
    const candidate = latest.current.candidate
    if (!candidate) return
    const next = { ...latest.current, ...candidate, candidate: null, unsaved: false, error: '' }
    latest.current = next; setState(next)
  }
  function discard() {
    try {
      localStorage.removeItem(draftStorageKey(uid))
      const next = { ...latest.current, title: '', body: '', savedAt: null, candidate: null, unsaved: false, error: '' }
      latest.current = next; setState(next)
    } catch {
      setState(previous => ({ ...previous, error: '초안을 지우지 못했습니다. 다시 시도해 주세요.' }))
    }
  }
  function submitted() {
    let error = ''
    try { localStorage.removeItem(draftStorageKey(uid)) }
    catch {
      try { localStorage.setItem(draftStorageKey(uid), 'null') }
      catch { error = '등록은 완료됐지만 이 브라우저의 초안을 지우지 못했습니다. 남은 초안은 다시 등록하지 말고 버려 주세요.' }
    }
    const next = { ...latest.current, title: '', body: '', savedAt: null, candidate: null, unsaved: false, error }
    latest.current = next; setState(next)
  }
  return { ...current, change, resume, discard, submitted, retrySave: () => change({}) }
}
