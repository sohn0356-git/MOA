// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import {set as saveFirebase} from 'firebase/database'
import { MeditationApp } from './MeditationApp'
const state = vi.hoisted(() => ({
  user: { uid: 'owner', displayName: 'Google 사용자', email: 'owner@example.com', photoURL: '' },
  entries: {} as Record<string, unknown>,
  publicPhotos: {} as Record<string, unknown>,
  praiseBank: {} as Record<string, unknown>,
  update: vi.fn(),
  parallelMissing:false,
  parallelMismatch:false,
  plan: { date: '2026-10-31', title: '말씀', theme: '사랑', reference: '요한복음 13:34', question: '오늘의 적용은?', verses: [{ number: 1, text: '서로 사랑하라' }] },
}))
vi.mock('../../services/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: state.user }), getRealtimeDb: () => ({}), getFirebaseStorage: () => ({}),
}))
vi.mock('../../services/faithSession', () => ({ getFaithAuth: () => ({ currentUser: state.user }), getFaithDb: () => ({}), getFaithStorage: () => ({}) }))
vi.mock('firebase/auth', () => ({ updateProfile: vi.fn() }))
vi.mock('firebase/storage', () => ({ deleteObject: vi.fn(), getDownloadURL: vi.fn(), ref: vi.fn(), uploadBytesResumable: vi.fn() }))
vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path = '') => path,
  onValue: (path: string, callback: (snapshot: { val: () => unknown }) => void) => {
    callback({ val: () => path === 'users/' + state.user.uid + '/meditationEntries' ? state.entries : path === 'crossPhotos' ? state.publicPhotos : path === 'lunchPraiseTracks' ? state.praiseBank : null })
    return () => {}
  },
  get: vi.fn(async () => ({ val: () => null })), push: () => ({ key: 'new-entry' }),
  update: state.update, set: vi.fn(), remove: vi.fn(), runTransaction: vi.fn(), serverTimestamp: () => 123,
}))
vi.mock('./useScripturePlan', () => ({ useScripturePlan: (_date:string,language:string,_fetch:unknown,enabled=true) => ({remotePlan:!enabled||language!=='ko'&&state.parallelMissing?null:{...state.plan,reference:language!=='ko'&&state.parallelMismatch?'다른 본문':state.plan.reference,verses:state.plan.verses.map(v=>({...v,text:language==='en'?'Love one another':language==='ja'?'互いに愛し合いなさい':v.text}))},isLoading:false,error:'',isFallback:enabled&&language!=='ko'&&state.parallelMissing,retry:vi.fn()}) }))
const image = 'data:image/png;base64,AAAA'
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) }
  localStorage.clear()
  state.user.uid = 'owner'
  state.parallelMissing=false;state.parallelMismatch=false
  state.publicPhotos = {}
  state.praiseBank = {}
  state.update.mockReset().mockResolvedValue(undefined)
  state.entries = { original: {
    authorUid: 'owner', authorName: 'AI 01', activityId: 'ai01',
    mind: '수정 전 묵상', apply: '오늘의 적용', prayer: '기도', audience: 'private',
    reference: '요한복음 13:34', theme: '사랑', selectedDate: '2026-10-15', createdAt: '2026-10-15T01:00:00.000Z',
    selectedVerseNumbers: [1], verseText: '서로 사랑하라', crossImage: image,
  } }
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })
async function openEdit() {
  render(<MeditationApp activityId="ai03"/>)
  fireEvent.click(within(screen.getByRole('navigation', { name: '모아' })).getByRole('button', { name: '묵상·기도' }))
  fireEvent.click(screen.getByRole('tab', { name: '내 묵상' }))
  fireEvent.click(await screen.findByText('수정 전 묵상'))
  fireEvent.click(screen.getByRole('button', { name: '묵상 수정' }))
  return screen.findByRole('heading', { name: '묵상 수정' })
}
describe('real devotion editing and activity authorship', () => {
  it.each([undefined, null, {}])('edits and saves a Firebase record whose empty verse list is missing (%s)', async selectedVerseNumbers => {
    const original = state.entries.original as Record<string, unknown>
    state.entries.original = { ...original, selectedVerseNumbers }
    if (selectedVerseNumbers === undefined) delete (state.entries.original as Record<string, unknown>).selectedVerseNumbers
    await openEdit()
    const memo = screen.getByRole('textbox', { name: /묵상 메모/ })
    expect((memo as HTMLTextAreaElement).value).toBe('수정 전 묵상')
    fireEvent.change(memo, { target: { value: '말씀 선택 없이 수정한 묵상' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(state.update).toHaveBeenCalled())
    const payload = state.update.mock.calls.find(call => call[1]['users/owner/meditationEntries/original'])![1]['users/owner/meditationEntries/original']
    expect(payload.selectedVerseNumbers).toEqual([])
    expect(payload.mind).toBe('말씀 선택 없이 수정한 묵상')
    expect(payload.verseText).toBe(original.verseText)
    expect(payload.crossImage).toBe(image)
    await waitFor(() => expect(screen.getAllByText('말씀 선택 없이 수정한 묵상').length).toBeGreaterThan(0))
  })

  it('edits an existing AI-owned devotion with the selected AI authentication UID', async () => {
    state.user.uid = 'ai03'
    state.entries.original = { ...(state.entries.original as object), authorUid: 'ai03', authorName: 'AI 03', activityId: 'ai03' }
    await openEdit()
    fireEvent.change(screen.getByRole('textbox', { name: /묵상 메모/ }), { target: { value: 'AI 03 기존 글 수정' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(state.update).toHaveBeenCalled())
    const payload = state.update.mock.calls.find(call => call[1]['users/ai03/meditationEntries/original'])![1]['users/ai03/meditationEntries/original']
    expect(payload.authorUid).toBe('ai03')
    expect(payload.mind).toBe('AI 03 기존 글 수정')
  })

  it('opens an older record, preserves its verse and cross picture, and immediately shows the saved edit', async () => {
    await openEdit()
    const memo = screen.getByRole('textbox', { name: /묵상 메모/ })
    expect((memo as HTMLTextAreaElement).value).toBe('수정 전 묵상')
    fireEvent.change(memo, { target: { value: '수정한 묵상 본문' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(state.update).toHaveBeenCalled())
    const payload = state.update.mock.calls.find(call => call[1]['users/owner/meditationEntries/original'])![1]['users/owner/meditationEntries/original']
    expect(payload.mind).toBe('수정한 묵상 본문')
    expect(payload.selectedVerseNumbers).toEqual([1])
    expect(payload.crossImage).toBe(image)
    expect(payload.authorUid).toBe('owner')
    expect(payload.activityId).toBe('ai01')
    await waitFor(() => expect(screen.queryByRole('heading', { name: '묵상 수정' })).toBeNull())
    expect(screen.getAllByText('수정한 묵상 본문').length).toBeGreaterThan(0)
  })
  it('keeps the editing draft visible when saving fails', async () => {
    await openEdit()
    state.update.mockRejectedValueOnce(new Error('저장 연결 실패'))
    fireEvent.change(screen.getByRole('textbox', { name: /묵상 메모/ }), { target: { value: '다시 저장할 묵상' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('저장 연결 실패'))
    expect((screen.getByRole('textbox', { name: /묵상 메모/ }) as HTMLTextAreaElement).value).toBe('다시 저장할 묵상')
  })
  it('uses the selected AI activity name for a new entry without changing the authenticated owner', async () => {
    state.entries = {}
    render(<MeditationApp activityId="ai03"/>)
    fireEvent.click(within(screen.getByRole('navigation', { name: '모아' })).getByRole('button', { name: '묵상·기도' }))
    fireEvent.click(screen.getByRole('button', { name: '묵상 쓰기' }))
    fireEvent.change(screen.getByRole('textbox', { name: /묵상 메모/ }), { target: { value: 'AI 03으로 쓴 묵상' } })
    fireEvent.click(screen.getByRole('button', { name: '나만 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(state.update).toHaveBeenCalled())
    const payload = state.update.mock.calls.find(call => call[1]['users/owner/meditationEntries/new-entry'])![1]['users/owner/meditationEntries/new-entry']
    expect(payload.authorUid).toBe('owner')
    expect(payload.activityId).toBe('ai03')
    expect(payload.authorName).toBe('AI 03')
    expect(state.user.uid).toBe('owner')
  })
})

it('selects an AI author inside the composer and blocks posting during authentication', async () => {
  const selectActivity = vi.fn().mockResolvedValue(undefined)
  render(<MeditationApp activityId="ai01" activityBusy onActivityChange={selectActivity}/>)
  fireEvent.click(within(screen.getByRole('navigation', { name: '모아' })).getByRole('button', { name: '묵상·기도' }))
  fireEvent.click(screen.getByRole('button', { name: '묵상 쓰기' }))
  fireEvent.change(screen.getByRole('textbox', { name: /묵상 메모/ }), { target: { value: '보존할 초안' } })
  expect(screen.getByRole('combobox', { name: '새 묵상 작성자' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '저장하고 십자가에 공유' })).toBeDisabled()
  expect(state.update).not.toHaveBeenCalled()
})

it('recovers actual editing fields after a reload and removes the restored draft only after successful save', async () => {
  await openEdit()
  fireEvent.change(screen.getByRole('textbox', { name: /묵상 메모/ }), { target: { value: '새로고침 직전의 묵상' } })
  fireEvent.change(screen.getByRole('combobox', { name: '공개 그룹' }), { target: { value: '주일 묵상' } })
  cleanup()
  render(<MeditationApp activityId="ai03"/>)
  fireEvent.click(await screen.findByRole('button', { name: '최근 묵상 이어쓰기' }))
  expect((screen.getByRole('textbox', { name: /묵상 메모/ }) as HTMLTextAreaElement).value).toBe('새로고침 직전의 묵상')
  expect((screen.getByRole('combobox', { name: '공개 그룹' }) as HTMLInputElement).value).toBe('주일 묵상')
  expect(screen.getByAltText('첨부한 십자가 그림 미리보기')).toHaveAttribute('src', image)
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  await waitFor(() => expect(state.update).toHaveBeenCalled())
  await waitFor(() => expect(screen.queryByRole('heading', { name: '묵상 수정' })).toBeNull())
  expect(Object.keys(localStorage).filter(key => key.startsWith('moa.faith.devotionDraft.v1:'))).toHaveLength(0)
})

it('shows private devotions only through My posts and does not publish when filtering or reading', async () => {
  render(<MeditationApp activityId="ai03"/>)
  fireEvent.click(within(screen.getByRole('navigation',{name:'모아'})).getByRole('button',{name:'피드'}))
  expect(screen.queryByRole('button', { name: /의 묵상 보기:/ })).toBeNull()
  expect(screen.queryByRole('button', { name: '묵상 나누기' })).toBeNull()
  expect(screen.queryByRole('navigation', { name: '피드 그룹' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '책갈피 펼치기' }))
  fireEvent.click(within(screen.getByRole('navigation', { name: '피드 그룹' })).getByRole('button', { name: '내 글' }))
  const tile = screen.getByRole('button', { name: /의 묵상 보기:/ })
  expect(tile).toHaveTextContent('')
  fireEvent.click(tile)
  expect(screen.getByText(/수정 전 묵상/)).toBeInTheDocument()
  expect(screen.getByText(/나만 보기 묵상/)).toBeInTheDocument()
  expect(state.update).not.toHaveBeenCalled()
})

it('offers image-only editing on another user’s public devotion without exposing author controls',()=>{
 state.user.uid='bob';state.entries={}
 state.publicPhotos={devotion_alice_shared:{ownerUid:'alice',authorUid:'alice',authorName:'Alice',sourceType:'devotion',sourceEntryId:'shared',publicId:'devotion_alice_shared',imageUrl:image,caption:'Alice의 전체 공개 묵상',selectedDate:'2026-11-11',createdAt:'2026-10-15T01:00:00.000Z',storagePath:''}}
 render(<MeditationApp activityId="ai03"/>)
 fireEvent.click(within(screen.getByRole('navigation',{name:'모아'})).getByRole('button',{name:'피드'}))
 fireEvent.click(screen.getByRole('button',{name:/Alice의 묵상 보기/}))
 expect(screen.getByRole('button',{name:'공개 묵상 그림 수정'})).toBeEnabled()
 expect(screen.queryByRole('button',{name:'묵상 수정'})).toBeNull()
 expect(screen.queryByRole('button',{name:'삭제'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'공개 묵상 그림 수정'}))
 expect(screen.getByRole('button',{name:'그림 수정 저장'})).toBeDisabled()
 expect(screen.getByRole('button',{name:'닫기'})).toBeInTheDocument()
 expect(state.update).not.toHaveBeenCalled()
})

it('combines devotion and prayer under one bottom tab and places the gated sanctuary in the center',async()=>{
 const login=vi.fn().mockResolvedValue(undefined)
 render(<MeditationApp activityId="ai03" onChurchSignIn={login}/>)
 const nav=screen.getByRole('navigation',{name:'모아'})
 expect(within(nav).getByRole('button',{name:'예배당'})).toHaveAttribute('aria-current','page')
 expect(screen.getByRole('heading',{name:'로그인하고 들어오세요'})).toBeInTheDocument()
 expect(within(nav).getAllByRole('button').map(button=>button.textContent)).toEqual(['피드','묵상·기도','예배당','질문','내 기록'])
 fireEvent.click(within(nav).getByRole('button',{name:'묵상·기도'}))
 fireEvent.click(within(screen.getByRole('navigation',{name:'묵상과 기도'})).getByRole('button',{name:'기도'}))
 expect(screen.getByRole('tab',{name:'함께 기도'})).toBeInTheDocument()
 expect(within(nav).getByRole('button',{name:'묵상·기도'})).toHaveAttribute('aria-current','page')
 fireEvent.click(screen.getByRole('button',{name:'기도 작성'}))
 expect(screen.getByRole('heading',{name:'기도제목 작성'})).toBeInTheDocument()
 fireEvent.click(within(nav).getByRole('button',{name:'예배당'}))
 // An AI activity UID already exists in this test; it does not bypass primary account login.
 expect(screen.getByRole('heading',{name:'로그인하고 들어오세요'})).toBeInTheDocument()
 expect(screen.queryByRole('textbox',{name:'예배당 개인 기도 메모'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'로그인하고 예배당 입장'}))
 await waitFor(()=>expect(login).toHaveBeenCalledOnce())
})

it('shows a playable daily praise from historical uploads when today has no entry, and keeps it after remount',async()=>{
 state.praiseBank={'2020-01-01':{videoId:'abcdefghijk'},'2021-02-03':{youtubeUrl:'https://youtu.be/lmnopqrstuv'},invalid:{youtubeUrl:'https://example.com/broken'}}
 const first=render(<MeditationApp/>)
 fireEvent.click(within(screen.getByRole('navigation',{name:'모아'})).getByRole('button',{name:'피드'}))
 const player=await screen.findByTitle('오늘의 찬송 추천 YouTube 영상')
 const src=player.getAttribute('src')
 expect(src).toMatch(/^https:\/\/www[.]youtube[.]com\/embed\/(abcdefghijk|lmnopqrstuv)[?]/)
 expect(screen.queryByText('오늘의 찬양을 준비하고 있어요.')).toBeNull()
 first.unmount()
 state.praiseBank=Object.fromEntries(Object.entries(state.praiseBank).reverse())
 render(<MeditationApp/>)
 fireEvent.click(within(screen.getByRole('navigation',{name:'모아'})).getByRole('button',{name:'피드'}))
 expect((await screen.findByTitle('오늘의 찬송 추천 YouTube 영상')).getAttribute('src')).toBe(src)
})

it('refreshes the daily player at Korean midnight even when the library has only one song',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-19T14:59:00Z'))
 state.praiseBank={'2020-01-01':{videoId:'abcdefghijk'}}
 render(<MeditationApp/>)
 fireEvent.click(within(screen.getByRole('navigation',{name:'모아'})).getByRole('button',{name:'피드'}))
 const previous=await screen.findByTitle('오늘의 찬송 추천 YouTube 영상')
 vi.setSystemTime(new Date('2026-11-19T15:00:00Z'))
 fireEvent.focus(window)
 await waitFor(()=>expect(previous.isConnected).toBe(false))
 expect((await screen.findByTitle('오늘의 찬송 추천 YouTube 영상')).getAttribute('src')).toContain('/embed/abcdefghijk?')
 expect(JSON.parse(localStorage.getItem('moa.faith.dailyPraise.v1')!).day).toBe('2026-11-20')
})

it('replaces profile photo editing with the primary-account chapel avatar editor',async()=>{
 const view=render(<MeditationApp activityId="ai03"/>)
 fireEvent.click(within(screen.getByRole('navigation',{name:'모아'})).getByRole('button',{name:'내 기록'}))
 view.rerender(<MeditationApp activityId="ai03" churchMember={{uid:'google-alice',displayName:'Alice'}}/>)
 expect(screen.getByRole('img',{name:'프로필의 내 아바타'})).toBeInTheDocument()
 expect(screen.queryByRole('button',{name:'프로필 편집'})).toBeNull()
 expect(screen.queryByRole('button',{name:'프로필 사진 변경'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'아바타 편집'}))
 fireEvent.click(screen.getByRole('tab',{name:'여성'}))
 fireEvent.click(screen.getByRole('button',{name:'라벤더 샘플 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'캐릭터 저장'}))
 await waitFor(()=>expect(saveFirebase).toHaveBeenCalledWith('sanctuary/avatars/google-alice',expect.objectContaining({name:'Alice',gender:'female'})))
 expect(screen.getByRole('img',{name:'프로필의 내 아바타'})).toHaveAttribute('data-gender','female')
 expect(state.update).not.toHaveBeenCalled()
})

it('pairs verses in two languages and opens writing from the end with both texts',async()=>{
 render(<MeditationApp/>)
 fireEvent.click(within(screen.getByRole('navigation',{name:'모아'})).getByRole('button',{name:'묵상·기도'}))
 fireEvent.click(screen.getByRole('button',{name:'대조 읽기'}))
 expect(screen.getByRole('combobox',{name:'대조 언어'})).toHaveValue('en')
 expect(document.querySelector('.faith-verse-translation')).toHaveTextContent('Love one another')
 fireEvent.click(document.querySelector('.faith-verse-list button')!)
 fireEvent.click(screen.getByRole('button',{name:'묵상하기'}))
 await waitFor(()=>expect(screen.getByRole('heading',{name:'묵상 작성'})).toHaveFocus())
 expect(document.querySelector('.faith-selected-quote')).toHaveTextContent('서로 사랑하라')
 expect(document.querySelector('.faith-selected-quote')).toHaveTextContent('Love one another')
 fireEvent.change(screen.getByRole('textbox',{name:/묵상 메모/}),{target:{value:'두 언어로 묵상한 내용'}})
 fireEvent.click(screen.getByRole('button',{name:'나만 보기'}))
 fireEvent.click(screen.getByRole('button',{name:'저장'}))
 await waitFor(()=>expect(state.update).toHaveBeenCalled())
 const payload=state.update.mock.calls.find(c=>c[1]['users/owner/meditationEntries/new-entry'])![1]['users/owner/meditationEntries/new-entry']
 expect(payload.verseText).toContain('서로 사랑하라');expect(payload.verseText).toContain('Love one another')
})
it.each(['missing','mismatched'])('does not present a %s translation as the matching second language',kind=>{
 state.parallelMissing=kind==='missing';state.parallelMismatch=kind==='mismatched'
 render(<MeditationApp/>);fireEvent.click(within(screen.getByRole('navigation',{name:'모아'})).getByRole('button',{name:'묵상·기도'}));fireEvent.click(screen.getByRole('button',{name:'대조 읽기'}))
 expect(document.querySelector('.faith-verse-translation')).toBeNull()
 expect(screen.getByText(/같은 날짜·범위의 대조 본문을/)).toBeInTheDocument()
 expect(screen.getByRole('button',{name:'대조 본문 다시 불러오기'})).toBeInTheDocument()
})
it('remembers the comparison setting and permits a different second language',()=>{
 const view=render(<MeditationApp/>);fireEvent.click(within(screen.getByRole('navigation',{name:'모아'})).getByRole('button',{name:'묵상·기도'}));fireEvent.click(screen.getByRole('button',{name:'대조 읽기'}))
 fireEvent.change(screen.getByRole('combobox',{name:'대조 언어'}),{target:{value:'ja'}})
 expect(document.querySelector('.faith-verse-translation')).toHaveTextContent('互いに愛し合いなさい')
 view.unmount();render(<MeditationApp/>);fireEvent.click(within(screen.getByRole('navigation',{name:'모아'})).getByRole('button',{name:'묵상·기도'}))
 expect(screen.getByRole('button',{name:'대조 읽기'})).toHaveAttribute('aria-pressed','true');expect(screen.getByRole('combobox',{name:'대조 언어'})).toHaveValue('ja')
})
it('preserves a saved bilingual quotation when editing only the meditation',async()=>{
 const quote='[한국어] 서로 사랑하라\n[English] Love one another'
 state.entries.original={...state.entries.original as object,verseText:quote}
 await openEdit();fireEvent.change(screen.getByRole('textbox',{name:/묵상 메모/}),{target:{value:'본문을 유지하는 수정'}});fireEvent.click(screen.getByRole('button',{name:'저장'}))
 await waitFor(()=>expect(state.update).toHaveBeenCalled())
 expect(state.update.mock.calls.find(c=>c[1]['users/owner/meditationEntries/original'])![1]['users/owner/meditationEntries/original'].verseText).toBe(quote)
})
