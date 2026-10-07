export function normalizeFaithTag(input: string) {
  return input
    .replace(/^#+/, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .toLocaleLowerCase('ko-KR')
}

export function normalizeFaithTags(values: string[]) {
  const seen = new Set<string>()
  const tags: string[] = []

  values.forEach((value) => {
    const tag = normalizeFaithTag(value)

    if (!tag || seen.has(tag)) {
      return
    }

    seen.add(tag)
    tags.push(tag)
  })

  return tags
}

export function extractHashTags(input: string) {
  const explicitTags = Array.from(input.matchAll(/#([^\s#]+)/g)).map((match) => match[1] ?? '')
  const fallbackTags = input
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)

  return normalizeFaithTags(explicitTags.length ? explicitTags : fallbackTags)
}

export function getTagSuggestions(allTags: string[], query: string, selectedTags: string[]) {
  const normalizedQuery = normalizeFaithTag(query)
  const selected = new Set(selectedTags)
  const uniqueTags = normalizeFaithTags(allTags)

  return uniqueTags
    .filter((tag) => !selected.has(tag))
    .filter((tag) => !normalizedQuery || tag === normalizedQuery || tag.startsWith(normalizedQuery))
    .sort((first, second) => {
      if (first === normalizedQuery) {
        return -1
      }

      if (second === normalizedQuery) {
        return 1
      }

      return first.localeCompare(second, 'ko-KR')
    })
    .slice(0, 8)
}

export type TaggedQuestion = {
  id: string
  createdAt: string
  tags: string[]
}

export function getRelatedQuestions<T extends TaggedQuestion>(
  questions: T[],
  currentId: string,
  selectedTags: string[],
) {
  if (!selectedTags.length) {
    return []
  }

  const selected = new Set(selectedTags)

  return questions
    .filter((question) => question.id !== currentId)
    .map((question) => ({
      question,
      matchCount: normalizeFaithTags(question.tags).filter((tag) => selected.has(tag)).length,
    }))
    .filter((item) => item.matchCount > 0)
    .sort((first, second) => {
      if (second.matchCount !== first.matchCount) {
        return second.matchCount - first.matchCount
      }

      return Date.parse(second.question.createdAt) - Date.parse(first.question.createdAt)
    })
    .map((item) => item.question)
}

export function extractYouTubeVideoId(input: string) {
  const value = input.trim()

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value
  }

  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] ?? ''
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const id = url.searchParams.get('v') ?? url.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/)?.[1] ?? ''
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
    }
  } catch {
    return null
  }

  return null
}

export function getYouTubeEmbedUrl(input?: string) {
  if (!input) {
    return null
  }

  const videoId = extractYouTubeVideoId(input)
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}
