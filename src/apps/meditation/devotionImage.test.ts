import { describe, expect, it } from 'vitest'
import { isDevotionImage, MAX_DEVOTION_IMAGE_LENGTH, prepareDevotionImage } from './devotionImage'
describe('devotion image validation', () => {
  it('accepts supported embedded pictures and rejects SVG, external URLs, and oversized records', () => {
    expect(isDevotionImage('data:image/png;base64,AAAA')).toBe(true)
    for (const value of [undefined, 'https://example.com/cross.png', 'data:image/svg+xml;base64,AAAA', 'data:image/webp;base64,' + 'A'.repeat(MAX_DEVOTION_IMAGE_LENGTH)]) expect(isDevotionImage(value)).toBe(false)
  })
  it('rejects unsupported files and excessive input size before decoding', async () => {
    await expect(prepareDevotionImage(new File(['svg'], 'cross.svg', { type: 'image/svg+xml' }))).rejects.toThrow('JPG')
    await expect(prepareDevotionImage(new File([new Uint8Array(8 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }))).rejects.toThrow('8MB')
  })
})
