// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { WeddingApp } from './WeddingApp'

const auth = vi.hoisted(() => ({ uid: 'alice' }))
vi.mock('../../services/firebase', () => ({ getFirebaseAuth: () => ({ currentUser: { uid: auth.uid } }) }))
vi.mock('./KoreaMap', () => ({ KoreaMap: ({ onAdd, places, onSelect }: { onAdd: (lat: number, lng: number) => void; places: { id: string; title: string }[]; onSelect: (place: unknown) => void }) => <div aria-label="대한민국 지도"><button onClick={() => onAdd(37.5665, 126.978)}>지도에서 위치 선택</button>{places.map(p => <button key={p.id} onClick={() => onSelect(p)}>{p.title} 지도 마커</button>)}</div> }))
beforeEach(() => {
  localStorage.clear(); auth.uid = 'alice'
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const saved = () => JSON.parse(localStorage.getItem('moa-wedding-v1:alice') || '{}')
async function openPlace() {
  fireEvent.click(screen.getByRole('navigation', { name: '결혼준비 메뉴' }).querySelectorAll('button')[1])
  fireEvent.click(screen.getByText('지도에서 위치 선택'))
  return waitFor(() => screen.getByRole('form', { name: '장소 편집' }))
}
describe('wedding planner', () => {
  it('has five bottom destinations with map second; saves and edits every marker field and persists after remount', async () => {
    const first = render(<WeddingApp />)
    const nav = screen.getByRole('navigation', { name: '결혼준비 메뉴' })
    expect(within(nav).getAllByRole('button').map(b => b.textContent)).toEqual(['홈', '지도', '체크리스트', '예산', '노트'])
    let form = await openPlace()
    fireEvent.change(within(form).getByLabelText('제목'), { target: { value: '서울 웨딩홀' } })
    fireEvent.change(within(form).getByLabelText('내용'), { target: { value: '토요일 상담 예약' } })
    fireEvent.change(within(form).getByLabelText('마커 색상'), { target: { value: '#123abc' } })
    fireEvent.change(within(form).getByLabelText('아이콘 (이모지 / 문자)'), { target: { value: '🌷' } })
    fireEvent.submit(form)
    expect(saved().places[0]).toMatchObject({ lat: 37.5665, lng: 126.978, title: '서울 웨딩홀', body: '토요일 상담 예약', color: '#123abc', icon: '🌷' })
    fireEvent.click(screen.getByText('서울 웨딩홀 지도 마커'))
    form = await waitFor(() => screen.getByRole('form', { name: '장소 편집' }))
    fireEvent.change(within(form).getByLabelText('제목'), { target: { value: '제주 스튜디오' } })
    fireEvent.change(within(form).getByLabelText('내용'), { target: { value: '야외 촬영' } })
    fireEvent.change(within(form).getByLabelText('위도'), { target: { value: '33.4996' } })
    fireEvent.change(within(form).getByLabelText('경도'), { target: { value: '126.5312' } })
    fireEvent.click(within(form).getByRole('button', { name: '아이콘 📷' }))
    fireEvent.change(within(form).getByLabelText('마커 색상'), { target: { value: '#ff00aa' } })
    fireEvent.submit(form)
    expect(saved().places).toHaveLength(1)
    expect(saved().places[0]).toMatchObject({ lat: 33.4996, lng: 126.5312, title: '제주 스튜디오', body: '야외 촬영', color: '#ff00aa', icon: '📷' })
    first.unmount(); render(<WeddingApp />)
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: '지도' }))
    expect(screen.getByText('제주 스튜디오 지도 마커')).toBeTruthy()
  })
  it('cancels without saving and keeps edits open when browser storage fails', async () => {
    render(<WeddingApp />)
    let form = await openPlace()
    fireEvent.change(within(form).getByLabelText('제목'), { target: { value: '취소할 장소' } })
    fireEvent.click(within(form).getByRole('button', { name: '취소' }))
    expect(localStorage.getItem('moa-wedding-v1:alice')).toBeNull()
    fireEvent.click(screen.getByText('지도에서 위치 선택'))
    form = await waitFor(() => screen.getByRole('form', { name: '장소 편집' }))
    fireEvent.change(within(form).getByLabelText('제목'), { target: { value: '다시 저장할 장소' } })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    fireEvent.submit(form)
    expect(within(form).getByRole('alert').textContent).toContain('저장하지 못했습니다')
    expect(screen.getByRole('form', { name: '장소 편집' })).toBeTruthy()
  })
  it('isolates wedding records between accounts', async () => {
    const first = render(<WeddingApp />)
    const form = await openPlace()
    fireEvent.change(within(form).getByLabelText('제목'), { target: { value: '비공개 준비 장소' } })
    fireEvent.submit(form)
    first.unmount(); auth.uid = 'bob'; render(<WeddingApp />)
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: '지도' }))
    expect(screen.queryByText('비공개 준비 장소')).toBeNull()
    expect(localStorage.getItem('moa-wedding-v1:alice')).toContain('비공개 준비 장소')
  })
})
