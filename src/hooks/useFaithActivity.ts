import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { aiLoginAccounts } from '../data/aiAccounts'
import { getAiActivityAuth, setFaithAiActivity } from '../services/faithSession'

const PREFERENCE = 'moa.faith.activityId'
function remember(id: string) { try { localStorage.setItem(PREFERENCE, id) } catch { /* Account permission does not depend on preference storage. */ } }
export function useFaithActivity() {
  const [activityId, setActivityId] = useState('')
  const [isLoading, setLoading] = useState(true)
  const [isSwitching, setSwitching] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const restored = useRef(false)
  function apply(id: string) { setFaithAiActivity(Boolean(id)); setActivityId(id); remember(id) }
  async function selectActivity(id: string) {
    if (pending.current) return
    const account = aiLoginAccounts.find(item => item.accountId === id)
    if (id && !account) { setError('선택한 AI 아이디를 찾을 수 없습니다.'); throw new Error('Invalid activity identity') }
    pending.current = true; setSwitching(true); setError('')
    try {
      const auth = getAiActivityAuth()
      if (!account) { await signOut(auth); apply(''); return }
      const result = await signInWithEmailAndPassword(auth, account.email, account.password)
      if (result.user.uid !== account.accountId || result.user.email !== account.email) {
        await signOut(auth)
        throw new Error('선택한 AI 계정의 권한을 확인하지 못했습니다.')
      }
      apply(account.accountId)
    } catch (error) {
      setError('AI 활동 권한 전환에 실패했습니다. 잠시 후 다시 선택해주세요.')
      throw error
    } finally { pending.current = false; setSwitching(false); setLoading(false) }
  }
  useEffect(() => {
    let stop: (() => void) | undefined
    try {
      stop = onAuthStateChanged(getAiActivityAuth(), user => {
        const account = aiLoginAccounts.find(item => item.accountId === user?.uid && item.email === user?.email)
        const wasRestored = restored.current
        restored.current = true
        if (account) apply(account.accountId)
        else {
          setFaithAiActivity(false); setActivityId('')
          // Upgrade the old display-only preference into a verified activity session once.
          let saved = ''
          try { saved = localStorage.getItem(PREFERENCE) || '' } catch { /* No saved selection. */ }
          if (!wasRestored && !pending.current && aiLoginAccounts.some(item => item.accountId === saved)) {
            void selectActivity(saved).catch(() => {})
          }
        }
        setLoading(false)
      }, () => { setFaithAiActivity(false); setActivityId(''); setLoading(false); setError('AI 활동 권한을 확인하지 못했습니다. 다시 선택해주세요.') })
    } catch { setLoading(false); setError('AI 활동 연결을 준비하지 못했습니다. 연결 상태를 확인해주세요.') }
    return () => stop?.()
  }, [])
  return { activityId, isLoading, isSwitching, error, selectActivity, clearActivity: () => selectActivity('') }
}
