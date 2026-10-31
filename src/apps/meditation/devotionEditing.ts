import { isDevotionImage } from './devotionImage'

export function normalizeVerseNumbers(value: unknown): Array<number | string> {
  const values = Array.isArray(value) ? value
    : value && typeof value === 'object' && Object.keys(value).every(key => /^\d+$/.test(key)) ? Object.values(value) : []
  return values.filter((item): item is number | string => typeof item === 'string' && item.trim().length > 0 || typeof item === 'number' && Number.isFinite(item))
}
type EditableRecord = {
  mind?: unknown; apply?: unknown; prayer?: unknown; verseText?: unknown; reference?: unknown; theme?: unknown
  selectedDate?: unknown; selectedVerseNumbers?: unknown; audience?: unknown; bookmarked?: unknown; crossImage?: unknown
}
export function normalizeDevotionFields(entry: EditableRecord, fallbackDate: string) {
  const text = (value: unknown) => typeof value === 'string' ? value : ''
  const date = typeof entry.selectedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.selectedDate)
    && Number.isFinite(Date.parse(entry.selectedDate)) ? entry.selectedDate : fallbackDate
  const audience: 'private' | 'public' | 'group' = entry.audience === 'public' || entry.audience === 'group' ? entry.audience : 'private'
  return {
    mind: text(entry.mind), apply: text(entry.apply), prayer: text(entry.prayer),
    verseText: text(entry.verseText), reference: text(entry.reference), theme: text(entry.theme),
    selectedDate: date, selectedVerseNumbers: normalizeVerseNumbers(entry.selectedVerseNumbers),
    audience,
    bookmarked: entry.bookmarked === true, crossImage: isDevotionImage(entry.crossImage) ? entry.crossImage : '',
  }
}
