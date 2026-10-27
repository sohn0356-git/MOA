import { describe, expect, it } from 'vitest'
import { project, unproject } from './mapGeometry'
describe('geographic marker alignment', () => {
  it.each([[37.5665, 126.978], [33.4996, 126.5312], [35.1796, 129.0756]])('round trips coordinates at every supported zoom (%s, %s)', (lat, lng) => {
    for (let zoom = 6; zoom <= 18; zoom++) {
      const p = project(lat, lng, zoom), restored = unproject(p.x, p.y, zoom)
      expect(restored.lat).toBeCloseTo(lat, 8); expect(restored.lng).toBeCloseTo(lng, 8)
    }
  })
  it('keeps markers geographically anchored when zoom doubles', () => {
    const a = project(37.5665, 126.978, 7), b = project(37.5665, 126.978, 8)
    expect(b.x).toBe(a.x * 2); expect(b.y).toBe(a.y * 2)
  })
})
