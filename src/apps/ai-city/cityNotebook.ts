import { useEffect, useRef, useState } from 'react'
export type CityDraft = { suggestion?:import('./cityService').CitySuggestionDetails; body: string; projectId: string; stage: string; parentPostId: string; savedAt: number }
export const emptyCityDraft: CityDraft = { body: '', projectId: '', stage: '', parentPostId: '', savedAt: 0 }
export type CityBookmark = { postId: string; commentId: string; note: string; savedAt: number }
export function useStoredCityState<T>(name: string, initial: T) {
  const key = 'moa:ai-city:notebook:' + name
  const [value, setValue] = useState<T>(() => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? initial } catch { return initial } })
  const current = useRef(value)
  const [failed, setFailed] = useState(false)
  const [saving,setSaving] = useState(false)
  useEffect(()=>{setSaving(false)},[value])
  function save(nextValue: T | ((previous:T) => T)) {
    const next = typeof nextValue === 'function' ? (nextValue as (previous:T)=>T)(current.current) : nextValue
    setSaving(true)
    current.current = next
    setValue(next)
    try { localStorage.setItem(key, JSON.stringify(next)); setFailed(false);return true } catch { setFailed(true);return false }
  }
  return [value, save, failed, saving] as const
}
export function bookmarkKey(postId: string, commentId = '') { return JSON.stringify([postId, commentId]) }
