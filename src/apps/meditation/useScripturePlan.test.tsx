// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useScripturePlan } from './useScripturePlan'

afterEach(cleanup)
type Plan = { reference: string }
const actual: Plan = { reference: '선택한 날짜 본문' }

describe('scripture loading and retry', () => {
  it('shows the remote plan after a successful load', async () => {
    const fetchPlan = vi.fn().mockResolvedValue(actual)
    const { result } = renderHook(() => useScripturePlan<Plan, string>('2026-10-18', 'ko', fetchPlan))
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.remotePlan).toEqual(actual))
    expect(result.current.isFallback).toBe(false)
    expect(result.current.error).toBe('')
  })

  it('identifies missing data as fallback and retries the original date and language', async () => {
    const fetchPlan = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(actual)
    const { result } = renderHook(() => useScripturePlan<Plan, string>('2026-10-18', 'en', fetchPlan))
    await waitFor(() => expect(result.current.isFallback).toBe(true))
    expect(result.current.error).toContain('데이터가 없습니다')
    act(() => result.current.retry())
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.remotePlan).toEqual(actual))
    expect(fetchPlan.mock.calls).toEqual([['2026-10-18', 'en'], ['2026-10-18', 'en']])
    expect(result.current.isFallback).toBe(false)
    expect(result.current.error).toBe('')
  })

  it('handles query failure and failed retry without retaining the old plan', async () => {
    const fetchPlan = vi.fn().mockRejectedValue(new Error('permission or network failure'))
    const { result } = renderHook(() => useScripturePlan<Plan, string>('2026-10-18', 'ja', fetchPlan))
    await waitFor(() => expect(result.current.isFallback).toBe(true))
    expect(result.current.error).toContain('다시 시도')
    act(() => result.current.retry())
    await waitFor(() => expect(fetchPlan).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.isFallback).toBe(true))
    expect(result.current.remotePlan).toBeNull()
  })

  it('discards late responses after changing the date or language', async () => {
    let finishOld: (plan: Plan) => void = () => {}
    const fetchPlan = vi.fn()
      .mockImplementationOnce(() => new Promise<Plan>(resolve => { finishOld = resolve }))
      .mockResolvedValueOnce(actual)
    const { result, rerender } = renderHook(
      ({ date, language }) => useScripturePlan<Plan, string>(date, language, fetchPlan),
      { initialProps: { date: '2026-10-17', language: 'ko' } },
    )
    rerender({ date: '2026-10-18', language: 'en' })
    await waitFor(() => expect(result.current.remotePlan).toEqual(actual))
    await act(async () => finishOld({ reference: '이전 날짜 본문' }))
    expect(result.current.remotePlan).toEqual(actual)
  })

  it('does not display a previous successful plan for a newly selected date', async () => {
    const fetchPlan = vi.fn().mockResolvedValueOnce(actual).mockResolvedValueOnce(null)
    const { result, rerender } = renderHook(
      ({ date }) => useScripturePlan<Plan, string>(date, 'ko', fetchPlan),
      { initialProps: { date: '2026-10-17' } },
    )
    await waitFor(() => expect(result.current.remotePlan).toEqual(actual))
    rerender({ date: '2026-10-18' })
    expect(result.current.remotePlan).toBeNull()
    await waitFor(() => expect(result.current.isFallback).toBe(true))
  })
})
