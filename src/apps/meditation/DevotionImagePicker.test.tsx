// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { DevotionImage, DevotionImagePicker } from './DevotionImagePicker'
const mocks = vi.hoisted(() => ({ prepare: vi.fn() }))
vi.mock('./devotionImage', async () => {
  const actual = await vi.importActual<typeof import('./devotionImage')>('./devotionImage')
  return { ...actual, prepareDevotionImage: mocks.prepare }
})
const image = 'data:image/webp;base64,UklGRg=='
function Editor() {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  return <><DevotionImagePicker value={value} onChange={setValue} onBusyChange={setBusy}/><button disabled={busy}>묵상 저장</button><DevotionImage value={value}/></>
}
beforeEach(() => { mocks.prepare.mockReset() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })
describe('devotion cross attachment', () => {
  it('previews a selected picture, prevents saving during preparation, and allows removal', async () => {
    let finish!: (value: string) => void
    mocks.prepare.mockImplementation(() => new Promise<string>(resolve => { finish = resolve }))
    render(<Editor/>)
    fireEvent.change(screen.getByLabelText('십자가 그림 파일'), { target: { files: [new File(['cross'], 'cross.png', { type: 'image/png' })] } })
    expect((screen.getByRole('button', { name: '묵상 저장' }) as HTMLButtonElement).disabled).toBe(true)
    finish(image)
    await waitFor(() => expect(screen.getByAltText('첨부한 십자가 그림 미리보기').getAttribute('src')).toBe(image))
    expect(screen.getByAltText('묵상에 첨부한 십자가 그림')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '첨부 제거' }))
    expect(screen.queryByAltText('묵상에 첨부한 십자가 그림')).toBeNull()
    expect((screen.getByRole('button', { name: '묵상 저장' }) as HTMLButtonElement).disabled).toBe(false)
  })
  it('keeps the previous picture when a replacement fails', async () => {
    mocks.prepare.mockRejectedValue(new Error('그림을 읽지 못했습니다.'))
    render(<DevotionImagePicker value={image} onChange={vi.fn()} onBusyChange={vi.fn()}/>)
    fireEvent.change(screen.getByLabelText('십자가 그림 파일'), { target: { files: [new File(['bad'], 'bad.png', { type: 'image/png' })] } })
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('그림을 읽지 못했습니다'))
    expect(screen.getByAltText('첨부한 십자가 그림 미리보기').getAttribute('src')).toBe(image)
  })
  it('renders existing attached images after reopening and ignores unsafe persisted values', () => {
    const view = render(<DevotionImage value={image}/>)
    expect(screen.getByAltText('묵상에 첨부한 십자가 그림').getAttribute('src')).toBe(image)
    view.rerender(<DevotionImage value="data:image/svg+xml;base64,AAAA"/>)
    expect(screen.queryByRole('img')).toBeNull()
  })
})
