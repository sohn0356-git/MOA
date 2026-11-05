// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useAppUpdate } from './useAppUpdate'
import { BEFORE_APP_UPDATE, offerAppUpdate, UPDATE_LOCK, UPDATE_UNLOCK } from '../lib/appUpdateProtocol'
afterEach(() => { cleanup(); offerAppUpdate(null) })
it('only offers an update and requires an explicit guarded action', async () => {
  const update = vi.fn().mockResolvedValue(undefined)
  const hook = renderHook(() => useAppUpdate())
  act(() => offerAppUpdate(update))
  expect(hook.result.current.hasUpdate).toBe(true)
  expect(update).not.toHaveBeenCalled()
  const block = (event: Event) => event.preventDefault()
  window.addEventListener(BEFORE_APP_UPDATE, block)
  await act(async () => { await hook.result.current.applyUpdate() })
  expect(update).not.toHaveBeenCalled()
  window.removeEventListener(BEFORE_APP_UPDATE, block)
  await act(async () => { await hook.result.current.applyUpdate() })
  expect(update).toHaveBeenCalledTimes(1)
})
it('unlocks the UI and reports failed updates; peer probes lock and release interaction', async () => {
  const hook = renderHook(() => useAppUpdate())
  act(() => offerAppUpdate(vi.fn().mockRejectedValue(new Error('다른 탭에서 작성 중'))))
  await act(async () => { await hook.result.current.applyUpdate() })
  expect(hook.result.current.isUpdating).toBe(false)
  expect(hook.result.current.updateError).toContain('다른 탭')
  act(() => { window.dispatchEvent(new Event(UPDATE_LOCK)) })
  expect(hook.result.current.isUpdating).toBe(true)
  act(() => { window.dispatchEvent(new Event(UPDATE_UNLOCK)) })
  expect(hook.result.current.isUpdating).toBe(false)
})
