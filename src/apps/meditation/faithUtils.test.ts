import { describe, expect, it } from 'vitest'
import {
  extractHashTags,
  extractYouTubeVideoId,
  getRelatedQuestions,
  getTagSuggestions,
  getYouTubeEmbedUrl,
  normalizeFaithTags,
} from './faithUtils'

describe('faith tag helpers', () => {
  it('normalizes tags and removes duplicates', () => {
    expect(normalizeFaithTags(['#기도', '기도', '말씀 묵상', ' Faith '])).toEqual([
      '기도',
      '말씀-묵상',
      'faith',
    ])
  })

  it('extracts hashtags from text', () => {
    expect(extractHashTags('#기도 #말씀 #기도')).toEqual(['기도', '말씀'])
  })

  it('sorts tag suggestions by exact and prefix match', () => {
    expect(getTagSuggestions(['기도', '기도응답', '말씀', '공동체'], '기도', ['기도'])).toEqual(['기도응답'])
  })

  it('recommends related questions by matching tag count and recency', () => {
    const related = getRelatedQuestions(
      [
        { id: 'a', tags: ['기도'], createdAt: '2026-10-01T00:00:00.000Z' },
        { id: 'b', tags: ['기도', '말씀'], createdAt: '2026-10-01T00:00:00.000Z' },
        { id: 'c', tags: ['기도'], createdAt: '2026-10-02T00:00:00.000Z' },
      ],
      'new',
      ['기도', '말씀'],
    )

    expect(related.map((question) => question.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('YouTube helpers', () => {
  it('extracts ids only from supported YouTube inputs', () => {
    expect(extractYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=4')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull()
  })

  it('builds official embed urls', () => {
    expect(getYouTubeEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })
})
