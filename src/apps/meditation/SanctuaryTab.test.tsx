// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SanctuaryTab } from './SanctuaryTab'
import { sanctuaryKey } from './sanctuaryState'
import { canApplyAppUpdate } from '../../lib/appUpdateProtocol'
const scripture={reference:'요한복음 14:27',text:'평안을 너희에게 끼치노니'}
const props={onRead:vi.fn(),onPrayer:vi.fn(),scripture}
beforeEach(()=>{localStorage.clear();vi.clearAllMocks()})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers()})
it('requires a real signed-in member before mounting personal sanctuary content',async()=>{
 localStorage.setItem(sanctuaryKey('alice'),JSON.stringify({note:'비공개 메모'}))
 const login=vi.fn().mockResolvedValue(undefined)
 const reads=vi.spyOn(Storage.prototype,'getItem')
 render(<SanctuaryTab {...props} member={null} onSignIn={login}/>)
 expect(screen.getByRole('heading',{name:'로그인하고 들어오세요'})).toBeInTheDocument()
 expect(screen.queryByRole('textbox',{name:'예배당 개인 기도 메모'})).toBeNull()
 expect(reads).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'로그인하고 예배당 입장'}))
 await waitFor(()=>expect(login).toHaveBeenCalledOnce())
})
it('isolates notes and candles by account and restores them after returning',()=>{
 const view=render(<SanctuaryTab {...props} member={{uid:'alice',displayName:'Alice'}}/>)
 fireEvent.change(screen.getByRole('textbox',{name:'예배당 개인 기도 메모'}),{target:{value:'Alice만의 기도'}})
 fireEvent.click(screen.getByRole('button',{name:'촛불 켜기'}))
 fireEvent.click(screen.getByRole('button',{name:'뒤쪽 오른편 자리 선택'}))
 expect(JSON.parse(localStorage.getItem(sanctuaryKey('alice'))!).note).toBe('Alice만의 기도')
 view.rerender(<SanctuaryTab {...props} member={{uid:'bob',displayName:'Bob'}}/>)
 expect(screen.getByRole('textbox',{name:'예배당 개인 기도 메모'})).toHaveValue('')
 expect(screen.getByRole('button',{name:'앞쪽 왼편 자리 선택'})).toHaveAttribute('aria-pressed','true')
 view.rerender(<SanctuaryTab {...props} member={{uid:'alice',displayName:'Alice'}}/>)
 expect(screen.getByRole('textbox',{name:'예배당 개인 기도 메모'})).toHaveValue('Alice만의 기도')
 expect(screen.getByRole('button',{name:'뒤쪽 오른편 자리 선택'})).toHaveAttribute('aria-pressed','true')
 view.rerender(<SanctuaryTab {...props} member={null}/>)
 expect(screen.queryByRole('textbox')).toBeNull()
})
it('runs, pauses and completes an actual prayer countdown once',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-12T03:00:00Z'))
 render(<SanctuaryTab {...props} member={{uid:'alice',displayName:'Alice'}}/>)
 fireEvent.click(screen.getByRole('button',{name:'기도 시작'}))
 act(()=>{vi.advanceTimersByTime(10000)})
 expect(screen.getByRole('timer')).toHaveTextContent('04:50')
 fireEvent.click(screen.getByRole('button',{name:'잠시 멈춤'}))
 act(()=>{vi.advanceTimersByTime(30000)})
 expect(screen.getByRole('timer')).toHaveTextContent('04:50')
 fireEvent.click(screen.getByRole('button',{name:'기도 시작'}))
 act(()=>{vi.advanceTimersByTime(290000)})
 expect(screen.getByRole('timer')).toHaveTextContent('00:00')
 expect(screen.getByText(/기도 시간을 마쳤습니다/)).toBeInTheDocument()
 expect(JSON.parse(localStorage.getItem(sanctuaryKey('alice'))!).sessions).toBe(1)
 act(()=>{vi.advanceTimersByTime(30000)})
 expect(JSON.parse(localStorage.getItem(sanctuaryKey('alice'))!).sessions).toBe(1)
})
it('keeps unsaved notes visible and guards updates if local persistence fails',()=>{
 render(<SanctuaryTab {...props} member={{uid:'alice',displayName:'Alice'}}/>)
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')})
 fireEvent.change(screen.getByRole('textbox',{name:'예배당 개인 기도 메모'}),{target:{value:'잃지 않을 메모'}})
 expect(screen.getByRole('textbox')).toHaveValue('잃지 않을 메모')
 expect(screen.getByRole('alert')).toHaveTextContent('임시저장하지 못했습니다')
 let allowed=true;act(()=>{allowed=canApplyAppUpdate()})
 expect(allowed).toBe(false)
})
