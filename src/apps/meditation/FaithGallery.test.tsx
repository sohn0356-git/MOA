// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { FaithGallery } from './FaithGallery'
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) }
})
afterEach(cleanup)
const photos = [{ id: 'one', imageUrl: '/one.jpg', caption: '요한복음\n본문 전체', authorName: 'AI 01', groupName: '매일 묵상' }, { id: 'two', imageUrl: '', caption: '함께하는 기도', groupName: '기도' }]
function Gallery() {
  const [group, setGroup] = useState('')
  const [groups, setGroups] = useState<string[]>([])
  return <FaithGallery photos={photos} groups={groups} selectedGroup={group} onSelectGroup={setGroup}
    onAddGroup={name => { setGroups([...groups, name]); setGroup(name) }} header={<p>오늘의 나눔</p>}
    limit={8} sentinelRef={null} renderDetail={(photo, close) => <><p>{photo.caption}</p><button onClick={close}>읽기 마침</button></>} />
}
it('opens the full devotion from its gallery tile and closes without navigating away', () => {
  render(<Gallery />)
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /AI 01의 묵상 보기/ }))
  expect(within(screen.getByRole('dialog')).getByText(/본문 전체/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '묵상 닫기' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('filters by the book-spine group and creates an assignable custom group', () => {
  render(<Gallery />)
  fireEvent.click(within(screen.getByRole('navigation', { name: '피드 그룹' })).getByRole('button', { name: '기도' }))
  expect(screen.queryByRole('button', { name: /AI 01의 묵상 보기/ })).toBeNull()
  expect(screen.getByRole('button', { name: /이웃의 묵상 보기/ })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '피드 그룹 추가' }))
  fireEvent.change(screen.getByRole('textbox', { name: '새 그룹 이름' }), { target: { value: '주일 기록' } })
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(screen.getByRole('button', { name: '주일 기록' })).toHaveAttribute('aria-pressed', 'true')
})
