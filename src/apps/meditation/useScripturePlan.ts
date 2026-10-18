import { useCallback, useEffect, useState } from 'react'

export function useScripturePlan<T, L extends string>(
  date: string, language: L, fetchPlan: (date: string, language: L) => Promise<T | null>,
) {
  const key = JSON.stringify([date, language])
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ key: string; attempt: number; plan: T | null; error: string; loading: boolean }>({
    key: '', attempt: -1, plan: null, error: '', loading: true,
  })
  useEffect(() => {
    let active = true
    setState({ key, attempt, plan: null, error: '', loading: true })
    const load = async () => {
      try {
        const plan = await fetchPlan(date, language)
        if (active) setState({ key, attempt, plan, loading: false, error: plan ? '' : '선택한 날짜의 말씀 데이터가 없습니다.' })
      } catch {
        if (active) setState({ key, attempt, plan: null, loading: false, error: '말씀을 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.' })
      }
    }
    void load()
    return () => { active = false }
  }, [date, language, fetchPlan, key, attempt])
  const isCurrent = state.key === key && state.attempt === attempt
  const isLoading = !isCurrent || state.loading
  const remotePlan = isCurrent ? state.plan : null
  const retry = useCallback(() => setAttempt(value => value + 1), [])
  return { remotePlan, isLoading, error: isCurrent ? state.error : '', isFallback: !isLoading && !remotePlan, retry }
}
