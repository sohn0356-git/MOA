// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { CityMap } from './CityMap'
import { defaultCityProfiles } from './cityResidents'
import { subscribeCitySignboards, saveCitySignboard, subscribeCityPlaces, saveCityPlace, type CityPlace, type CityProject, type CityPost } from './cityService'
vi.mock('./cityService', () => ({ subscribeCityPlaces: vi.fn(), saveCityPlace: vi.fn(), subscribeCitySignboards:vi.fn(),saveCitySignboard:vi.fn() }))
vi.mock('./CityProjectTasks', () => ({ CityProjectTasks: ({ projectId }: { projectId: string }) => <section aria-label="자원할 일">과제 프로젝트: {projectId}</section> }))
afterEach(cleanup)
beforeEach(() => { vi.clearAllMocks(); vi.mocked(subscribeCitySignboards).mockImplementation((_id,callback)=>{callback({});return()=>{}});vi.mocked(saveCitySignboard).mockResolvedValue(undefined) })
const projects: CityProject[] = [{ id: 'first-plaza', name: '첫 광장', description: '첫 만남', stage: 'idea', participantIds: {} }, { id: 'project-table', name: '작은 식탁', description: '함께 식사', stage: 'idea', participantIds: { ai01: true } }]
const posts: CityPost[] = [{ id: 'source', projectId: 'project-table', kind: 'feed', accountId: 'ai01', authorUid: 'u1', body: '식탁의 최신 이야기', createdAt: 2 }, { id: 'other', projectId: 'first-plaza', kind: 'feed', accountId: 'ai02', authorUid: 'u2', body: '다른 장소 이야기', createdAt: 3 }]
function setupProps() { return { projects, posts, profiles: defaultCityProfiles, residentId: 'ai01', accountId: 'ai01', busy: false, perform: vi.fn(async (action: () => Promise<void>) => { await action(); return true }), onOpen: vi.fn(), onProject: vi.fn() } }
it('visits the same project from map/list with original post and task links after a project rename', () => {
  vi.mocked(subscribeCityPlaces).mockImplementation(callback => { callback([]); return () => {} })
  const props = setupProps()
  const view = render(<CityMap {...props} />)
  fireEvent.click(screen.getByRole('button', { name: /작은 식탁.*기본 배치/ }))
  let visit = screen.getByRole('region', { name: '작은 식탁 방문' })
  expect(within(visit).getByText('과제 프로젝트: project-table')).toBeTruthy()
  expect(within(visit).queryByText('다른 장소 이야기')).toBeNull()
  fireEvent.click(within(visit).getByRole('button', { name: '식탁의 최신 이야기' }))
  expect(props.onOpen).toHaveBeenCalledWith('source')
  fireEvent.click(within(visit).getByRole('button', { name: '프로젝트 전체 열기' }))
  expect(props.onProject).toHaveBeenCalledWith('project-table')
  fireEvent.click(screen.getByRole('button', { name: '목록 보기' }))
  expect(screen.getByRole('button', { name: /작은 식탁.*기본 배치/ }).getAttribute('aria-pressed')).toBe('true')
  view.rerender(<CityMap {...props} projects={projects.map(p => p.id === 'project-table' ? { ...p, name: '함께 먹는 식탁' } : p)} />)
  visit = screen.getByRole('region', { name: '함께 먹는 식탁 방문' })
  expect(within(visit).getByText('과제 프로젝트: project-table')).toBeTruthy()
  expect(posts[0].body).toBe('식탁의 최신 이야기')
})
it('persists only place metadata and restores saved layout on reopening', async () => {
  let saved: CityPlace[] = []
  let notify: (value: CityPlace[]) => void = () => {}
  vi.mocked(subscribeCityPlaces).mockImplementation(callback => { notify = callback; callback(saved); return () => {} })
  vi.mocked(saveCityPlace).mockImplementation(async (_account, id, input) => { saved = [{ ...input, id, createdAt: 1, createdByUid: 'u1', updatedAt: 2, updatedByUid: 'u1' }]; notify(saved) })
  const props = setupProps()
  let view = render(<CityMap {...props} />)
  fireEvent.change(screen.getByLabelText('편집할 연결 프로젝트'), { target: { value: 'project-table' } })
  fireEvent.change(screen.getByLabelText('장소 이름'), { target: { value: '물가 식탁' } })
  fireEvent.change(screen.getByLabelText('장소 설명'), { target: { value: '잠시 머무는 곳' } })
  fireEvent.change(screen.getByLabelText('가로 칸'), { target: { value: '3' } })
  fireEvent.change(screen.getByLabelText('세로 칸'), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: '장소 저장' }))
  await waitFor(() => expect(saveCityPlace).toHaveBeenCalledWith('ai01', 'project-table', { name: '물가 식탁', description: '잠시 머무는 곳', column: 3, row: 4 }))
  view.unmount()
  view = render(<CityMap {...props} />)
  const place = screen.getByRole('button', { name: /물가 식탁.*저장된 배치/ })
  expect(place.parentElement!.style.gridColumn).toBe('3')
  expect(place.parentElement!.style.gridRow).toBe('4')
  fireEvent.click(place)
  expect(screen.getByRole('region', { name: '물가 식탁 방문' })).toBeTruthy()
  expect(posts).toHaveLength(2)
  view.unmount()
})
it('does not offer writes when place loading fails', () => {
  vi.mocked(subscribeCityPlaces).mockImplementation((_callback, onError) => { onError(new Error('offline')); return () => {} })
  render(<CityMap {...setupProps()} />)
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.queryByRole('button', { name: '장소 저장' })).toBeNull()
})
