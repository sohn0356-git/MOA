import { FirebaseError } from 'firebase/app'
import { get, onValue, push, ref, remove, runTransaction, serverTimestamp, set, update } from 'firebase/database'
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { useEffect, useMemo, useRef, useState } from 'react'
import spriteUrl from '../../assets/faith/icons-sprite.svg?url'
import { getFirebaseAuth, getFirebaseStorage, getRealtimeDb } from '../../services/firebase'
import { FaithIcon, type FaithIconName } from './FaithIcon'
import {
  extractHashTags,
  getRelatedQuestions,
  getTagSuggestions,
  getYouTubeEmbedUrl,
  normalizeFaithTags,
} from './faithUtils'

const LOCAL_STORAGE_KEY = 'moa.meditation.entries.v4'

type Audience = 'private' | 'public' | 'group'
type FaithTab = 'feed' | 'devotion' | 'prayer' | 'qna' | 'profile'
type DevotionView = 'read' | 'write' | 'records' | 'detail' | 'edit'
type FeedView = 'list' | 'write'
type PrayerView = 'list' | 'write'
type QnaView = 'list' | 'write'
type ScriptureLanguage = 'ko' | 'en' | 'ja'

type Verse = {
  number: number
  text: string
}

type ScripturePlan = {
  date: string
  isRemote?: boolean
  title: string
  reference: string
  theme: string
  question: string
  verses: Verse[]
}

type FirebaseVerseRange = [unknown, unknown, unknown, unknown?]

type FirebaseVersePayload = {
  range?: FirebaseVerseRange
  sourceUrl?: unknown
  translation?: unknown
  verses?: unknown
}

type ScriptureCache = {
  translation?: string
  chapters?: Record<string, Record<string, string>>
}

type MeditationEntry = {
  id: string
  apply: string
  applyDone?: boolean
  audience: Audience
  bookmarked?: boolean
  createdAt: string
  mind: string
  mood?: string
  prayer?: string
  reference: string
  selectedDate: string
  selectedVerseNumbers: number[]
  theme: string
  verseText: string
}

type CrossPhoto = {
  id: string
  authorName?: string
  caption: string
  commentCount?: number
  createdAt: string
  imageUrl: string
  prayerCount?: number
  selectedDate: string
  storagePath: string
}

type LunchPraiseTrack = {
  id: string
  active?: boolean
  artist?: string
  title?: string
  videoId?: string
  youtubeUrl?: string
}

type PrayerComment = {
  id: string
  authorName: string
  authorUid: string
  body: string
  createdAt: string
}

type PrayerRequest = {
  id: string
  authorName?: string
  body: string
  commentCount?: number
  createdAt: string
  isAnswered: boolean
  prayerCount?: number
  reactedByMe?: boolean
  title: string
}

type FaithQuestion = {
  id: string
  answerCount?: number
  authorName?: string
  body: string
  createdAt: string
  tags: string[]
  title: string
}

const scripturePlans: ScripturePlan[] = [
  {
    date: '2026-10-02',
    title: '삶으로 드리는 예배',
    reference: '로마서 12:1-2',
    theme: '헌신',
    question: '오늘 하나님께 다시 맡겨야 할 생각과 습관은 무엇인가요?',
    verses: [
      {
        number: 1,
        text: '그러므로 형제들아 내가 하나님의 모든 자비하심으로 너희를 권하노니 너희 몸을 하나님이 기뻐하시는 거룩한 산 제물로 드리라 이는 너희가 드릴 영적 예배니라.',
      },
      {
        number: 2,
        text: '너희는 이 세대를 본받지 말고 오직 마음을 새롭게 함으로 변화를 받아 하나님의 선하시고 기뻐하시고 온전하신 뜻이 무엇인지 분별하도록 하라.',
      },
    ],
  },
  {
    date: '2026-10-03',
    title: '평안을 맡기는 기도',
    reference: '빌립보서 4:6-7',
    theme: '평안',
    question: '염려 대신 기도로 바꿔야 할 일은 무엇인가요?',
    verses: [
      { number: 6, text: '아무 것도 염려하지 말고 다만 모든 일에 기도와 간구로 너희 구할 것을 감사함으로 하나님께 아뢰라.' },
      { number: 7, text: '그리하면 모든 지각에 뛰어난 하나님의 평강이 그리스도 예수 안에서 너희 마음과 생각을 지키시리라.' },
    ],
  },
  {
    date: '2026-10-04',
    title: '주 안에 거하기',
    reference: '요한복음 15:4-5',
    theme: '동행',
    question: '열매보다 먼저 주님 안에 머물러야 할 영역은 어디인가요?',
    verses: [
      {
        number: 4,
        text: '내 안에 거하라 나도 너희 안에 거하리라 가지가 포도나무에 붙어 있지 아니하면 스스로 열매를 맺을 수 없음 같이 너희도 내 안에 있지 아니하면 그러하리라.',
      },
      {
        number: 5,
        text: '나는 포도나무요 너희는 가지라 그가 내 안에, 내가 그 안에 거하면 사람이 열매를 많이 맺나니 나를 떠나서는 너희가 아무 것도 할 수 없음이라.',
      },
    ],
  },
  {
    date: '2026-10-05',
    title: '새 힘을 얻는 기다림',
    reference: '이사야 40:29-31',
    theme: '회복',
    question: '내 힘으로 버티던 자리에서 무엇을 기다림으로 바꿀 수 있나요?',
    verses: [
      { number: 29, text: '피곤한 자에게는 능력을 주시며 무능한 자에게는 힘을 더하시나니' },
      { number: 30, text: '소년이라도 피곤하며 곤비하며 장정이라도 넘어지며 쓰러지되' },
      {
        number: 31,
        text: '오직 여호와를 앙망하는 자는 새 힘을 얻으리니 독수리가 날개치며 올라감 같을 것이요 달음박질하여도 곤비하지 아니하겠고 걸어가도 피곤하지 아니하리로다.',
      },
    ],
  },
]

const knownPassageText: Record<string, Verse[]> = Object.fromEntries(scripturePlans.map((plan) => [plan.reference, plan.verses]))
const scriptureBookCachePromises = new Map<string, Promise<ScriptureCache | null>>()
const scriptureLanguageOptions: Array<{ id: ScriptureLanguage; label: string; translation: string }> = [
  { id: 'ko', label: '한국어', translation: '개역개정' },
  { id: 'en', label: 'English', translation: 'World English Bible' },
  { id: 'ja', label: '日本語', translation: 'Japanese Bungo-yaku' },
]
const scriptureBookSlugs: Record<string, string> = {
  창세기: 'genesis',
  출애굽기: 'exodus',
  레위기: 'leviticus',
  민수기: 'numbers',
  신명기: 'deuteronomy',
  여호수아: 'joshua',
  사사기: 'judges',
  룻기: 'ruth',
  사무엘상: '1-samuel',
  사무엘하: '2-samuel',
  열왕기상: '1-kings',
  열왕기하: '2-kings',
  역대상: '1-chronicles',
  역대하: '2-chronicles',
  에스라: 'ezra',
  느헤미야: 'nehemiah',
  에스더: 'esther',
  욥기: 'job',
  시편: 'psalms',
  잠언: 'proverbs',
  전도서: 'ecclesiastes',
  아가: 'song-of-songs',
  이사야: 'isaiah',
  예레미야: 'jeremiah',
  예레미야애가: 'lamentations',
  에스겔: 'ezekiel',
  다니엘: 'daniel',
  호세아: 'hosea',
  요엘: 'joel',
  아모스: 'amos',
  오바댜: 'obadiah',
  요나: 'jonah',
  미가: 'micah',
  나훔: 'nahum',
  하박국: 'habakkuk',
  스바냐: 'zephaniah',
  학개: 'haggai',
  스가랴: 'zechariah',
  말라기: 'malachi',
  마태복음: 'matthew',
  마가복음: 'mark',
  누가복음: 'luke',
  요한복음: 'john',
  사도행전: 'acts',
  로마서: 'romans',
  고린도전서: '1-corinthians',
  고린도후서: '2-corinthians',
  갈라디아서: 'galatians',
  에베소서: 'ephesians',
  빌립보서: 'philippians',
  골로새서: 'colossians',
  데살로니가전서: '1-thessalonians',
  데살로니가후서: '2-thessalonians',
  디모데전서: '1-timothy',
  디모데후서: '2-timothy',
  디도서: 'titus',
  빌레몬서: 'philemon',
  히브리서: 'hebrews',
  야고보서: 'james',
  베드로전서: '1-peter',
  베드로후서: '2-peter',
  요한일서: '1-john',
  요한이서: '2-john',
  요한삼서: '3-john',
  유다서: 'jude',
  요한계시록: 'revelation',
}

const tabs: Array<{ id: FaithTab; icon: FaithIconName; label: string }> = [
  { id: 'feed', icon: 'home', label: '피드' },
  { id: 'devotion', icon: 'scripture', label: '묵상' },
  { id: 'prayer', icon: 'prayer', label: '기도' },
  { id: 'qna', icon: 'question', label: '질문' },
  { id: 'profile', icon: 'user', label: '내 기록' },
]

function getTodayKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Seoul',
    year: 'numeric',
  }).formatToParts(new Date())

  return `${parts.find((part) => part.type === 'year')?.value ?? '1970'}-${parts.find((part) => part.type === 'month')?.value ?? '01'}-${parts.find((part) => part.type === 'day')?.value ?? '01'}`
}

function createLocalId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatDateTime(value: string | number | undefined) {
  const date = new Date(value ?? '')

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(date)
}

function getEntryTitle(entry: MeditationEntry) {
  return entry.mind.trim().split('\n')[0] || entry.apply.trim().split('\n')[0] || entry.reference
}

function getAudienceLabel(audience: Audience) {
  if (audience === 'group') {
    return '그룹 공개'
  }

  if (audience === 'public') {
    return '전체 공개'
  }

  return '나만 보기'
}

function loadLocalEntries(): MeditationEntry[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === 'object' && 'id' in entry) as MeditationEntry[] : []
  } catch {
    return []
  }
}

function saveLocalEntries(entries: MeditationEntry[]) {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries))
}

function getPlanForDate(date: string) {
  const exactPlan = scripturePlans.find((plan) => plan.date === date)

  if (exactPlan) {
    return exactPlan
  }

  const seed = date.split('-').join('')
  return scripturePlans[Number(seed) % scripturePlans.length]
}

function buildReference(book: string, chapter: number, start: number, end: number) {
  return `${book} ${chapter}:${start === end ? start : `${start}-${end}`}`
}

function normalizeFirebaseVerses(value: unknown): Verse[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const verses = value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const verse = item as Record<string, unknown>
      const number = Number(verse.number)
      const text = typeof verse.text === 'string' ? verse.text.trim() : ''
      return Number.isFinite(number) && text ? { number, text } : null
    })
    .filter((item): item is Verse => item !== null)

  return verses.length ? verses : null
}

function normalizeLunchPraiseTracks(value: unknown): LunchPraiseTrack[] {
  if (!value || typeof value !== 'object') {
    return []
  }

  return Object.entries(value as Record<string, unknown>)
    .map((entry): LunchPraiseTrack | null => {
      const [id, item] = entry
      if (!item || typeof item !== 'object') {
        return null
      }

      const data = item as Record<string, unknown>
      const active = typeof data.active === 'boolean' ? data.active : true
      const youtubeUrl = typeof data.youtubeUrl === 'string' ? data.youtubeUrl : typeof data.videoUrl === 'string' ? data.videoUrl : typeof data.audioUrl === 'string' ? data.audioUrl : ''
      const videoId = typeof data.videoId === 'string' ? data.videoId : ''

      if (!active || (!youtubeUrl && !videoId)) {
        return null
      }

      return {
        id,
        active,
        artist: typeof data.artist === 'string' ? data.artist : '',
        title: typeof data.title === 'string' ? data.title : '오찬추',
        videoId,
        youtubeUrl,
      }
    })
    .filter((track): track is LunchPraiseTrack => track !== null)
}

async function loadScriptureBook(language: ScriptureLanguage, book: string) {
  const slug = scriptureBookSlugs[book]

  if (!slug) {
    return null
  }

  const cacheKey = `${language}:${slug}`
  const existingPromise = scriptureBookCachePromises.get(cacheKey)

  if (existingPromise) {
    return existingPromise
  }

  const promise = fetch(`${import.meta.env.BASE_URL}scripture/${language}/${slug}.json`, { cache: 'no-cache' })
    .then((response) => response.ok ? response.json() as Promise<ScriptureCache> : null)
    .catch(() => null)

  scriptureBookCachePromises.set(cacheKey, promise)
  return promise
}

async function getScriptureVersesFromCache(language: ScriptureLanguage, range: FirebaseVerseRange) {
  const [bookValue, chapterValue, startValue, endValue] = range
  const book = typeof bookValue === 'string' ? bookValue : ''
  const chapter = Number(chapterValue)
  const start = Number(startValue)
  const end = Number(endValue ?? startValue)

  if (!book || !Number.isFinite(chapter) || !Number.isFinite(start) || !Number.isFinite(end)) {
    return null
  }

  const cache = await loadScriptureBook(language, book)
  const chapterVerses = cache?.chapters?.[String(chapter)]

  if (!chapterVerses) {
    return null
  }

  const verses: Verse[] = []

  for (let verseNumber = start; verseNumber <= end; verseNumber += 1) {
    const text = chapterVerses[String(verseNumber)]

    if (!text) {
      return null
    }

    verses.push({ number: verseNumber, text })
  }

  return verses
}

function planFromFirebaseRange(date: string, range: FirebaseVerseRange, remoteVerses?: Verse[] | null, translation?: string) {
  const [bookValue, chapterValue, startValue, endValue] = range
  const book = typeof bookValue === 'string' ? bookValue : ''
  const chapter = Number(chapterValue)
  const start = Number(startValue)
  const end = Number(endValue ?? startValue)

  if (!book || !Number.isFinite(chapter) || !Number.isFinite(start) || !Number.isFinite(end)) {
    return null
  }

  const reference = buildReference(book, chapter, start, end)
  const verses = remoteVerses ?? knownPassageText[reference] ?? null

  if (!verses?.length) {
    return null
  }

  return {
    date,
    isRemote: true,
    title: '오늘의 본문',
    reference,
    theme: translation ? `Firebase 말씀 · ${translation}` : 'Firebase 말씀',
    question: '오늘 이 본문에서 붙잡아야 할 한 문장은 무엇인가요?',
    verses,
  } satisfies ScripturePlan
}

async function fetchFirebasePlan(date: string, language: ScriptureLanguage) {
  const [year, month, day] = date.split('-')
  const snapshot = await get(ref(getRealtimeDb(), `verse/${year}/${month}${day}`))
  const value = snapshot.val() as FirebaseVerseRange[] | FirebaseVersePayload | null

  if (!value) {
    return null
  }

  if (Array.isArray(value)) {
    const range = value[0]
    const verses = range ? await getScriptureVersesFromCache(language, range) : null
    const translation = scriptureLanguageOptions.find((option) => option.id === language)?.translation
    return range ? planFromFirebaseRange(date, range, verses, translation) : null
  }

  const range = Array.isArray(value.range) ? value.range : null
  const verses = normalizeFirebaseVerses(value.verses)
  const translation = typeof value.translation === 'string' ? value.translation : undefined
  const cachedVerses = range ? await getScriptureVersesFromCache(language, range) : null

  return range ? planFromFirebaseRange(date, range, cachedVerses ?? verses, translation) : null
}

function getSelectedVerseText(plan: ScripturePlan, selectedVerseNumbers: number[]) {
  const selectedSet = new Set(selectedVerseNumbers)
  const verses = selectedVerseNumbers.length ? plan.verses.filter((verse) => selectedSet.has(verse.number)) : plan.verses
  return verses.map((verse) => verse.text).join(' ')
}

function getUserEntriesPath(userId: string) {
  return `users/${userId}/meditationEntries`
}

function getUserCrossPhotosPath(userId: string) {
  return `users/${userId}/crossPhotos`
}

function getUserPrayerRequestsPath(userId: string) {
  return `users/${userId}/prayerRequests`
}

function getUserPrayerCommentsPath(userId: string, prayerId: string) {
  return `users/${userId}/prayerComments/${prayerId}`
}

function getUserPrayerReactionsPath(userId: string, prayerId: string) {
  return `users/${userId}/prayerReactions/${prayerId}`
}

function getUserFaithQuestionsPath(userId: string) {
  return `users/${userId}/faithQuestions`
}

function mapList<T extends { id: string; createdAt?: string }>(value: Record<string, Omit<T, 'id'>> | null) {
  return value
    ? Object.entries(value)
        .map(([id, item]) => ({ ...item, id }) as T)
        .sort((first, second) => Date.parse(second.createdAt ?? '') - Date.parse(first.createdAt ?? ''))
    : []
}

function Icon({ name, label, className }: { name: FaithIconName; label?: string; className?: string }) {
  return <FaithIcon className={className ?? 'faith-icon'} label={label} name={name} spriteUrl={spriteUrl} />
}

function EmptyState({ children }: { children: string }) {
  return <p className="faith-empty">{children}</p>
}

function StatusLine({ error, status }: { error: string; status: string }) {
  return (
    <>
      {error ? <p className="faith-alert faith-alert-error">{error}</p> : null}
      {status ? <p className="faith-alert faith-alert-success">{status}</p> : null}
    </>
  )
}

export function MeditationApp() {
  const recordListRef = useRef<HTMLDivElement | null>(null)
  const [activeTab, setActiveTab] = useState<FaithTab>('feed')
  const [devotionView, setDevotionView] = useState<DevotionView>('read')
  const [feedView, setFeedView] = useState<FeedView>('list')
  const [prayerView, setPrayerView] = useState<PrayerView>('list')
  const [qnaView, setQnaView] = useState<QnaView>('list')
  const [selectedDate, setSelectedDate] = useState(getTodayKey)
  const [scriptureLanguage, setScriptureLanguage] = useState<ScriptureLanguage>('ko')
  const [selectedVerseNumbers, setSelectedVerseNumbers] = useState<number[]>([])
  const [fontScale, setFontScale] = useState(1)
  const [remotePlan, setRemotePlan] = useState<ScripturePlan | null>(null)
  const [isPlanLoading, setIsPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [mind, setMind] = useState('')
  const [apply, setApply] = useState('')
  const [prayerText, setPrayerText] = useState('')
  const [audience, setAudience] = useState<Audience>('private')
  const [bookmarked, setBookmarked] = useState(false)
  const [entries, setEntries] = useState<MeditationEntry[]>(loadLocalEntries)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBookmarked, setFilterBookmarked] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [crossPhotos, setCrossPhotos] = useState<CrossPhoto[]>([])
  const [crossCaption, setCrossCaption] = useState('')
  const [crossFile, setCrossFile] = useState<File | null>(null)
  const [isPhotoUploading, setIsPhotoUploading] = useState(false)
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([])
  const [prayerReactionMap, setPrayerReactionMap] = useState<Record<string, boolean>>({})
  const [prayerComments, setPrayerComments] = useState<Record<string, PrayerComment[]>>({})
  const [expandedPrayerId, setExpandedPrayerId] = useState('')
  const [prayerTitle, setPrayerTitle] = useState('')
  const [prayerBody, setPrayerBody] = useState('')
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [faithQuestions, setFaithQuestions] = useState<FaithQuestion[]>([])
  const [questionTitle, setQuestionTitle] = useState('')
  const [questionBody, setQuestionBody] = useState('')
  const [questionTagInput, setQuestionTagInput] = useState('')
  const [selectedQuestionTags, setSelectedQuestionTags] = useState<string[]>([])
  const [qnaSearch, setQnaSearch] = useState('')
  const [qnaTagFilter, setQnaTagFilter] = useState('')
  const [isComposingTag, setIsComposingTag] = useState(false)
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [lunchPraiseTracks, setLunchPraiseTracks] = useState<LunchPraiseTrack[]>([])
  const [isTrackLoading, setIsTrackLoading] = useState(true)
  const [syncState, setSyncState] = useState<'local' | 'syncing' | 'synced' | 'error'>('local')
  const [errorMessage, setErrorMessage] = useState('')
  const plan = useMemo(() => remotePlan ?? getPlanForDate(selectedDate), [remotePlan, selectedDate])
  const selectedVerseText = useMemo(() => getSelectedVerseText(plan, selectedVerseNumbers), [plan, selectedVerseNumbers])
  const currentUser = getFirebaseAuth().currentUser
  const authorName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'MOA Faith'
  const canSave = Boolean(mind.trim() || apply.trim() || prayerText.trim())
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null
  const todayKey = getTodayKey()
  const allQuestionTags = useMemo(() => normalizeFaithTags(faithQuestions.flatMap((question) => question.tags)), [faithQuestions])
  const tagSuggestions = useMemo(
    () => getTagSuggestions(allQuestionTags, questionTagInput, selectedQuestionTags),
    [allQuestionTags, questionTagInput, selectedQuestionTags],
  )
  const relatedQuestions = useMemo(
    () => getRelatedQuestions(faithQuestions, '', selectedQuestionTags).slice(0, 4),
    [faithQuestions, selectedQuestionTags],
  )
  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return entries.filter((entry) => {
      const searchable = `${entry.reference} ${entry.theme} ${entry.verseText} ${entry.mind} ${entry.apply} ${entry.prayer ?? ''}`.toLowerCase()
      return (!query || searchable.includes(query)) && (!filterBookmarked || entry.bookmarked)
    })
  }, [entries, filterBookmarked, searchTerm])
  const filteredQuestions = useMemo(() => {
    const query = qnaSearch.trim().toLowerCase()

    return faithQuestions.filter((question) => {
      const matchesQuery = !query || `${question.title} ${question.body} ${question.tags.join(' ')}`.toLowerCase().includes(query)
      const matchesTag = !qnaTagFilter || question.tags.includes(qnaTagFilter)
      return matchesQuery && matchesTag
    })
  }, [faithQuestions, qnaSearch, qnaTagFilter])
  const weekDates = useMemo(() => {
    const baseDate = new Date(`${selectedDate}T00:00:00+09:00`)
    const startDate = new Date(baseDate)
    startDate.setDate(baseDate.getDate() - baseDate.getDay())

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + index)
      return date
    })
  }, [selectedDate])
  const lunchPraise = lunchPraiseTracks[0]
  const lunchPraiseEmbedUrl = lunchPraise ? getYouTubeEmbedUrl(lunchPraise.videoId || lunchPraise.youtubeUrl) : null

  useEffect(() => {
    setSelectedVerseNumbers([])
    setRemotePlan(null)
    setPlanError('')
  }, [selectedDate, scriptureLanguage])

  useEffect(() => {
    let active = true

    setIsPlanLoading(true)
    setPlanError('')
    void fetchFirebasePlan(selectedDate, scriptureLanguage)
      .then((nextPlan) => {
        if (active) {
          setRemotePlan(nextPlan)
        }
      })
      .catch((error) => {
        if (active) {
          setPlanError(error instanceof Error ? error.message : '말씀을 불러오지 못했습니다.')
        }
      })
      .finally(() => {
        if (active) {
          setIsPlanLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [selectedDate, scriptureLanguage])

  useEffect(() => {
    if (!currentUser) {
      setSyncState('local')
      return undefined
    }

    setSyncState('syncing')
    return onValue(
      ref(getRealtimeDb(), getUserEntriesPath(currentUser.uid)),
      (snapshot) => {
        const remoteEntries = mapList<MeditationEntry>(snapshot.val())
        setEntries(remoteEntries)
        saveLocalEntries(remoteEntries)
        setSyncState('synced')
      },
      (error) => {
        setSyncState('error')
        setErrorMessage(error.message)
      },
    )
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) {
      setCrossPhotos([])
      setPrayerRequests([])
      setFaithQuestions([])
      return undefined
    }

    const db = getRealtimeDb()
    const subscriptions = [
      onValue(ref(db, getUserCrossPhotosPath(currentUser.uid)), (snapshot) => setCrossPhotos(mapList<CrossPhoto>(snapshot.val()))),
      onValue(ref(db, getUserPrayerRequestsPath(currentUser.uid)), (snapshot) => setPrayerRequests(mapList<PrayerRequest>(snapshot.val()))),
      onValue(ref(db, `users/${currentUser.uid}/prayerReactions`), (snapshot) => {
        const value = snapshot.val() as Record<string, Record<string, boolean>> | null
        setPrayerReactionMap(
          Object.fromEntries(Object.entries(value ?? {}).map(([prayerId, reactions]) => [prayerId, Boolean(reactions[currentUser.uid])])),
        )
      }),
      onValue(ref(db, `users/${currentUser.uid}/prayerComments`), (snapshot) => {
        const value = snapshot.val() as Record<string, Record<string, Omit<PrayerComment, 'id'>>> | null
        const comments = Object.fromEntries(
          Object.entries(value ?? {}).map(([prayerId, items]) => [prayerId, mapList<PrayerComment>(items)]),
        )
        setPrayerComments(comments)
      }),
      onValue(ref(db, getUserFaithQuestionsPath(currentUser.uid)), (snapshot) => {
        const questions = mapList<FaithQuestion>(snapshot.val()).map((question) => ({
          ...question,
          tags: normalizeFaithTags(question.tags ?? []),
        }))
        setFaithQuestions(questions)
      }),
    ]

    return () => subscriptions.forEach((unsubscribe) => unsubscribe())
  }, [currentUser])

  useEffect(() => {
    if (syncState !== 'synced') {
      saveLocalEntries(entries)
    }
  }, [entries, syncState])

  useEffect(() => {
    setIsTrackLoading(true)
    return onValue(
      ref(getRealtimeDb(), 'lunchPraiseTracks'),
      (snapshot) => {
        setLunchPraiseTracks(normalizeLunchPraiseTracks(snapshot.val()))
        setIsTrackLoading(false)
      },
      () => {
        setLunchPraiseTracks([])
        setIsTrackLoading(false)
      },
    )
  }, [])

  function handleBackHome() {
    history.pushState('', document.title, window.location.pathname + window.location.search)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }

  function handleTabChange(tab: FaithTab) {
    setActiveTab(tab)
    setErrorMessage('')
    setStatusMessage('')
    if (tab === 'feed') {
      setFeedView('list')
    } else if (tab === 'prayer') {
      setPrayerView('list')
    } else if (tab === 'qna') {
      setQnaView('list')
    } else if (tab === 'devotion') {
      setDevotionView('read')
    }
  }

  function handlePrimaryCreate() {
    if (activeTab === 'feed') {
      setFeedView('write')
    } else if (activeTab === 'prayer') {
      setPrayerView('write')
    } else if (activeTab === 'qna') {
      setQnaView('write')
    } else if (activeTab === 'devotion') {
      startWriting()
    }
  }

  function toggleVerse(verseNumber: number) {
    setSelectedVerseNumbers((currentNumbers) =>
      currentNumbers.includes(verseNumber)
        ? currentNumbers.filter((number) => number !== verseNumber)
        : [...currentNumbers, verseNumber].sort((first, second) => first - second),
    )
  }

  function startWriting() {
    setMind('')
    setApply('')
    setPrayerText('')
    setAudience('private')
    setBookmarked(false)
    setDevotionView('write')
  }

  function startEdit(entry: MeditationEntry) {
    setSelectedEntryId(entry.id)
    setSelectedDate(entry.selectedDate)
    setSelectedVerseNumbers(entry.selectedVerseNumbers)
    setMind(entry.mind)
    setApply(entry.apply)
    setPrayerText(entry.prayer ?? '')
    setAudience(entry.audience)
    setBookmarked(Boolean(entry.bookmarked))
    setDevotionView('edit')
  }

  async function handleSaveEntry() {
    if (!canSave || isSaving) {
      return
    }

    const entry: MeditationEntry = {
      id: createLocalId(),
      apply: apply.trim(),
      applyDone: false,
      audience,
      bookmarked,
      createdAt: new Date().toISOString(),
      mind: mind.trim(),
      prayer: prayerText.trim(),
      reference: plan.reference,
      selectedDate,
      selectedVerseNumbers,
      theme: plan.theme,
      verseText: selectedVerseText,
    }

    setIsSaving(true)
    setErrorMessage('')
    setStatusMessage('')

    try {
      let savedEntry = entry

      if (currentUser) {
        const entryRef = push(ref(getRealtimeDb(), getUserEntriesPath(currentUser.uid)))
        savedEntry = { ...entry, id: entryRef.key ?? entry.id }
        await set(entryRef, {
          ...savedEntry,
          id: null,
          createdAtMs: serverTimestamp(),
        })
      } else {
        setEntries((currentEntries) => [entry, ...currentEntries])
      }

      setMind('')
      setApply('')
      setPrayerText('')
      setSelectedEntryId(savedEntry.id)
      setDevotionView('detail')
      setStatusMessage('묵상을 저장했습니다.')
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : '저장하지 못했습니다. 작성 내용은 그대로 두었습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdateEntry() {
    if (!selectedEntry || !canSave || isSaving) {
      return
    }

    const updatedEntry: MeditationEntry = {
      ...selectedEntry,
      apply: apply.trim(),
      audience,
      bookmarked,
      mind: mind.trim(),
      prayer: prayerText.trim(),
      selectedVerseNumbers,
      verseText: selectedVerseText,
    }

    setIsSaving(true)
    setErrorMessage('')
    setStatusMessage('')

    try {
      if (currentUser && syncState === 'synced') {
        await update(ref(getRealtimeDb(), `${getUserEntriesPath(currentUser.uid)}/${selectedEntry.id}`), {
          apply: updatedEntry.apply,
          audience: updatedEntry.audience,
          bookmarked: updatedEntry.bookmarked,
          mind: updatedEntry.mind,
          prayer: updatedEntry.prayer,
          selectedVerseNumbers: updatedEntry.selectedVerseNumbers,
          verseText: updatedEntry.verseText,
          updatedAt: new Date().toISOString(),
          updatedAtMs: serverTimestamp(),
        })
      } else {
        setEntries((currentEntries) => currentEntries.map((entry) => entry.id === selectedEntry.id ? updatedEntry : entry))
      }

      setSelectedEntryId(updatedEntry.id)
      setDevotionView('detail')
      setStatusMessage('수정 내용을 저장했습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '수정 내용을 저장하지 못했습니다. 작성 내용은 그대로 두었습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteEntry(entry: MeditationEntry) {
    if (!window.confirm(`${formatDateLabel(entry.selectedDate)}의 묵상 기록을 삭제할까요?`)) {
      return
    }

    if (currentUser && syncState === 'synced') {
      await remove(ref(getRealtimeDb(), `${getUserEntriesPath(currentUser.uid)}/${entry.id}`))
    } else {
      setEntries((currentEntries) => currentEntries.filter((currentEntry) => currentEntry.id !== entry.id))
    }

    setDevotionView('records')
    setSelectedEntryId('')
  }

  async function handleApplyDone(entry: MeditationEntry, applyDone: boolean) {
    if (currentUser && syncState === 'synced') {
      await update(ref(getRealtimeDb(), `${getUserEntriesPath(currentUser.uid)}/${entry.id}`), { applyDone })
    } else {
      setEntries((currentEntries) => currentEntries.map((item) => item.id === entry.id ? { ...item, applyDone } : item))
    }
  }

  async function handlePhotoUpload() {
    if (!currentUser || !crossFile || isPhotoUploading) {
      return
    }

    setIsPhotoUploading(true)
    setErrorMessage('')

    try {
      const extension = crossFile.name.split('.').pop() || 'webp'
      const path = `users/${currentUser.uid}/photos/cross-${todayKey}-${createLocalId()}.${extension}`
      const uploadTask = uploadBytesResumable(storageRef(getFirebaseStorage(), path), crossFile, { contentType: crossFile.type })
      await uploadTask
      const imageUrl = await getDownloadURL(uploadTask.snapshot.ref)
      const photoRef = push(ref(getRealtimeDb(), getUserCrossPhotosPath(currentUser.uid)))

      await set(photoRef, {
        authorName,
        caption: crossCaption.trim(),
        commentCount: 0,
        createdAt: new Date().toISOString(),
        createdAtMs: serverTimestamp(),
        imageUrl,
        prayerCount: 0,
        selectedDate: todayKey,
        storagePath: path,
      })
      setCrossCaption('')
      setCrossFile(null)
      setFeedView('list')
    } catch (error) {
      setErrorMessage(error instanceof Error ? `사진 업로드에 실패했습니다: ${error.message}` : '사진 업로드에 실패했습니다.')
    } finally {
      setIsPhotoUploading(false)
    }
  }

  async function handlePrayerSave() {
    if (!currentUser || (!prayerTitle.trim() && !prayerBody.trim())) {
      return
    }

    const prayerRef = push(ref(getRealtimeDb(), getUserPrayerRequestsPath(currentUser.uid)))
    await set(prayerRef, {
      authorName,
      body: prayerBody.trim(),
      commentCount: 0,
      createdAt: new Date().toISOString(),
      createdAtMs: serverTimestamp(),
      isAnswered: false,
      prayerCount: 0,
      title: prayerTitle.trim() || '기도제목',
    })
    setPrayerTitle('')
    setPrayerBody('')
    setPrayerView('list')
  }

  async function handlePrayerToggle(request: PrayerRequest) {
    if (!currentUser) {
      return
    }

    const db = getRealtimeDb()
    const reactionRef = ref(db, `${getUserPrayerReactionsPath(currentUser.uid, request.id)}/${currentUser.uid}`)
    const previous = Boolean(prayerReactionMap[request.id])

    setPrayerRequests((currentRequests) =>
      currentRequests.map((item) =>
        item.id === request.id
          ? { ...item, prayerCount: Math.max(0, (item.prayerCount ?? 0) + (previous ? -1 : 1)) }
          : item,
      ),
    )

    try {
      const result = await runTransaction(reactionRef, (currentValue) => currentValue ? null : true)
      const didReact = Boolean(result.snapshot.val())
      const delta = didReact === previous ? 0 : didReact ? 1 : -1

      if (delta !== 0) {
        await runTransaction(ref(db, `${getUserPrayerRequestsPath(currentUser.uid)}/${request.id}/prayerCount`), (currentValue) =>
          Math.max(0, Number(currentValue ?? 0) + delta),
        )
      }
    } catch (error) {
      setPrayerRequests((currentRequests) => currentRequests.map((item) => item.id === request.id ? request : item))
      setErrorMessage(error instanceof Error ? error.message : '기도 반응을 저장하지 못했습니다.')
    }
  }

  async function handleCommentSave(prayerId: string) {
    if (!currentUser) {
      return
    }

    const body = (commentDrafts[prayerId] ?? '').trim()

    if (!body) {
      return
    }

    const commentRef = push(ref(getRealtimeDb(), getUserPrayerCommentsPath(currentUser.uid, prayerId)))
    await set(commentRef, {
      authorName,
      authorUid: currentUser.uid,
      body,
      createdAt: new Date().toISOString(),
      createdAtMs: serverTimestamp(),
    })
    await runTransaction(ref(getRealtimeDb(), `${getUserPrayerRequestsPath(currentUser.uid)}/${prayerId}/commentCount`), (currentValue) =>
      Number(currentValue ?? 0) + 1,
    )
    setCommentDrafts((currentDrafts) => ({ ...currentDrafts, [prayerId]: '' }))
  }

  async function handleDeleteComment(prayerId: string, comment: PrayerComment) {
    if (!currentUser || comment.authorUid !== currentUser.uid) {
      return
    }

    await remove(ref(getRealtimeDb(), `${getUserPrayerCommentsPath(currentUser.uid, prayerId)}/${comment.id}`))
    await runTransaction(ref(getRealtimeDb(), `${getUserPrayerRequestsPath(currentUser.uid)}/${prayerId}/commentCount`), (currentValue) =>
      Math.max(0, Number(currentValue ?? 0) - 1),
    )
  }

  async function handleQuestionSave() {
    if (!currentUser || (!questionTitle.trim() && !questionBody.trim())) {
      return
    }

    const tags = normalizeFaithTags([...selectedQuestionTags, ...extractHashTags(questionTagInput)])
    const questionRef = push(ref(getRealtimeDb(), getUserFaithQuestionsPath(currentUser.uid)))

    await set(questionRef, {
      answerCount: 0,
      authorName,
      body: questionBody.trim(),
      createdAt: new Date().toISOString(),
      createdAtMs: serverTimestamp(),
      tags,
      title: questionTitle.trim() || '신앙 질문',
    })
    setQuestionTitle('')
    setQuestionBody('')
    setQuestionTagInput('')
    setSelectedQuestionTags([])
    setQnaView('list')
  }

  function addQuestionTag(tag: string) {
    setSelectedQuestionTags((currentTags) => normalizeFaithTags([...currentTags, tag]))
    setQuestionTagInput('')
    setSuggestionIndex(0)
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (isComposingTag) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSuggestionIndex((currentIndex) => Math.min(tagSuggestions.length - 1, currentIndex + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSuggestionIndex((currentIndex) => Math.max(0, currentIndex - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      addQuestionTag(tagSuggestions[suggestionIndex] ?? questionTagInput)
    } else if (event.key === 'Escape') {
      setQuestionTagInput('')
    }
  }

  function renderHeaderTitle() {
    if (activeTab === 'feed') return '피드'
    if (activeTab === 'devotion') return '묵상'
    if (activeTab === 'prayer') return '기도'
    if (activeTab === 'qna') return '질문'
    return '내 기록'
  }

  return (
    <section className="sub-app faith-screen">
      <header className="faith-header">
        <button aria-label="앱 목록으로 돌아가기" className="faith-icon-button" type="button" onClick={handleBackHome}>
          <Icon name="back" />
        </button>
        <div className="faith-title">
          <Icon name="brand-app" />
          <div>
            <span>MOA Faith</span>
            <h2>{renderHeaderTitle()}</h2>
          </div>
        </div>
        {activeTab === 'profile' ? (
          <span className="faith-sync-dot" aria-label={syncState === 'synced' ? '동기화됨' : '연결 상태 확인 필요'} />
        ) : (
          <button aria-label="새로 작성" className="faith-icon-button" type="button" onClick={handlePrimaryCreate}>
            <Icon name="plus" />
          </button>
        )}
      </header>

      <main className="faith-content">
        <StatusLine error={errorMessage} status={statusMessage} />

        {activeTab === 'feed' ? (
          <section className="faith-stack">
            {feedView === 'write' ? (
              <section className="faith-panel" aria-labelledby="photo-write-title">
                <div className="faith-section-head">
                  <h3 id="photo-write-title">사진 올리기</h3>
                  <button className="faith-text-button" type="button" onClick={() => setFeedView('list')}>취소</button>
                </div>
                <label className="faith-file-field">
                  <Icon name="photo" />
                  <span>{crossFile ? crossFile.name : '이미지 선택'}</span>
                  <input accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => setCrossFile(event.target.files?.[0] ?? null)} />
                </label>
                <label className="faith-field">
                  <span>짧은 문장</span>
                  <input maxLength={80} value={crossCaption} onChange={(event) => setCrossCaption(event.target.value)} />
                </label>
                <button className="faith-primary" disabled={!currentUser || !crossFile || isPhotoUploading} type="button" onClick={() => void handlePhotoUpload()}>
                  {isPhotoUploading ? '업로드 중' : '피드에 올리기'}
                </button>
              </section>
            ) : (
              <>
                <section className="faith-youtube-section" aria-labelledby="lunch-praise-title">
                  <h3 id="lunch-praise-title">오찬추</h3>
                  {isTrackLoading ? (
                    <EmptyState>영상을 불러오고 있습니다.</EmptyState>
                  ) : lunchPraiseEmbedUrl ? (
                    <>
                      <iframe
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="faith-youtube"
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        src={lunchPraiseEmbedUrl}
                        title={lunchPraise?.title ? `오찬추: ${lunchPraise.title}` : '오늘의 찬송 추천 YouTube 영상'}
                      />
                      {lunchPraise?.youtubeUrl ? (
                        <a className="faith-youtube-link" href={lunchPraise.youtubeUrl} rel="noreferrer" target="_blank">YouTube에서 열기</a>
                      ) : null}
                    </>
                  ) : (
                    <EmptyState>중앙 설정에 YouTube videoId 또는 링크가 아직 없습니다.</EmptyState>
                  )}
                </section>

                <section className="faith-list" aria-label="사진 피드">
                  {crossPhotos.length ? (
                    crossPhotos.map((photo) => (
                      <article className="faith-photo-post" key={photo.id}>
                        <div className="faith-meta">
                          <strong>{photo.authorName || authorName}</strong>
                          <time>{formatDateTime(photo.createdAt)}</time>
                        </div>
                        <img alt={photo.caption || '피드 사진'} src={photo.imageUrl} />
                        {photo.caption ? <p>{photo.caption}</p> : null}
                        <ReactionRow
                          commentCount={photo.commentCount ?? 0}
                          prayerCount={photo.prayerCount ?? 0}
                          onComment={() => undefined}
                        />
                      </article>
                    ))
                  ) : (
                    <EmptyState>아직 올라온 사진이 없습니다.</EmptyState>
                  )}
                </section>
              </>
            )}
          </section>
        ) : null}

        {activeTab === 'devotion' ? (
          <section className="faith-stack">
            <div className="faith-controls">
              <label className="faith-date">
                <Icon name="calendar" />
                <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              </label>
              <div className="faith-tabs" role="tablist" aria-label="묵상 보기">
                <button aria-selected={devotionView !== 'records'} role="tab" type="button" onClick={() => setDevotionView('read')}>말씀</button>
                <button aria-selected={devotionView === 'records'} role="tab" type="button" onClick={() => setDevotionView('records')}>내 묵상</button>
              </div>
            </div>

            {devotionView === 'read' ? (
              <section className="faith-reading" aria-labelledby="scripture-title">
                <div className="faith-section-head">
                  <div>
                    <h3 id="scripture-title">{plan.reference}</h3>
                    <p>{plan.title}</p>
                  </div>
                  <div className="faith-icon-group">
                    <button aria-label="글자 크기 줄이기" className="faith-icon-button" type="button" onClick={() => setFontScale((value) => Math.max(0.9, value - 0.05))}>
                      <Icon name="font-size" />
                    </button>
                    <button aria-label="글자 크기 키우기" className="faith-icon-button" type="button" onClick={() => setFontScale((value) => Math.min(1.15, value + 0.05))}>
                      <Icon name="plus" />
                    </button>
                    <button aria-label="선택 구절 책갈피" aria-pressed={bookmarked} className="faith-icon-button" type="button" onClick={() => setBookmarked((value) => !value)}>
                      <Icon name={bookmarked ? 'bookmark-filled' : 'bookmark'} />
                    </button>
                  </div>
                </div>
                <div className="faith-language-row" aria-label="말씀 언어">
                  {scriptureLanguageOptions.map((option) => (
                    <button aria-pressed={scriptureLanguage === option.id} key={option.id} title={option.translation} type="button" onClick={() => setScriptureLanguage(option.id)}>
                      {option.label}
                    </button>
                  ))}
                </div>
                {planError ? <p className="faith-alert faith-alert-error">{planError}</p> : null}
                <div className="faith-verse-list" style={{ fontSize: `${17 * fontScale}px` }}>
                  {isPlanLoading ? (
                    <EmptyState>말씀을 불러오고 있습니다.</EmptyState>
                  ) : (
                    plan.verses.map((verse) => (
                      <button
                        aria-pressed={selectedVerseNumbers.includes(verse.number)}
                        className={selectedVerseNumbers.includes(verse.number) ? 'is-selected' : undefined}
                        key={verse.number}
                        type="button"
                        onClick={() => toggleVerse(verse.number)}
                      >
                        <sup>{verse.number}</sup>
                        <span>{verse.text}</span>
                      </button>
                    ))
                  )}
                </div>
                <p className="faith-question-line">{plan.question}</p>
                <button className="faith-primary" type="button" onClick={startWriting}>묵상 작성</button>
              </section>
            ) : null}

            {devotionView === 'write' || devotionView === 'edit' ? (
              <section className="faith-panel" aria-labelledby="write-title">
                <div className="faith-section-head">
                  <div>
                    <h3 id="write-title">{devotionView === 'edit' ? '묵상 수정' : '묵상 작성'}</h3>
                    <p>{plan.reference} · {getAudienceLabel(audience)}</p>
                  </div>
                  <button className="faith-text-button" type="button" onClick={() => setDevotionView(devotionView === 'edit' ? 'detail' : 'read')}>취소</button>
                </div>
                <div className="faith-focus">
                  <span>마음에 남은 말씀</span>
                  <p>{selectedVerseText}</p>
                </div>
                <label className="faith-field">
                  <span>오늘의 적용</span>
                  <textarea rows={4} value={apply} onChange={(event) => setApply(event.target.value)} />
                </label>
                <label className="faith-field">
                  <span>나의 기도</span>
                  <textarea rows={4} value={prayerText} onChange={(event) => setPrayerText(event.target.value)} />
                </label>
                <label className="faith-field">
                  <span>묵상 메모</span>
                  <textarea rows={6} value={mind} onChange={(event) => setMind(event.target.value)} />
                </label>
                <div className="faith-segment" aria-label="공개 범위">
                  {(['private', 'public', 'group'] as Audience[]).map((item) => (
                    <button aria-pressed={audience === item} key={item} type="button" onClick={() => setAudience(item)}>{getAudienceLabel(item)}</button>
                  ))}
                </div>
                <button className="faith-primary" disabled={!canSave || isSaving} type="button" onClick={() => void (devotionView === 'edit' ? handleUpdateEntry() : handleSaveEntry())}>
                  {isSaving ? '저장 중' : '저장'}
                </button>
              </section>
            ) : null}

            {devotionView === 'records' ? (
              <section className="faith-panel" aria-labelledby="records-title">
                <div className="faith-section-head">
                  <h3 id="records-title">날짜별 묵상</h3>
                  <button className="faith-text-button" type="button" onClick={() => setDevotionView('read')}>말씀</button>
                </div>
                <div className="faith-search-row">
                  <label>
                    <Icon name="search" />
                    <input placeholder="말씀과 기록 검색" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
                  </label>
                  <button aria-pressed={filterBookmarked} type="button" onClick={() => setFilterBookmarked((value) => !value)}>
                    <Icon name={filterBookmarked ? 'bookmark-filled' : 'bookmark'} />
                  </button>
                </div>
                <div className="faith-record-list" ref={recordListRef}>
                  {filteredEntries.length ? filteredEntries.map((entry) => (
                    <article className="faith-record-row" key={entry.id}>
                      <button type="button" onClick={() => {
                        setSelectedEntryId(entry.id)
                        setDevotionView('detail')
                      }}>
                        <time>{formatDateLabel(entry.selectedDate)}</time>
                        <strong>{getEntryTitle(entry)}</strong>
                        <span>{entry.reference}</span>
                      </button>
                      {entry.apply ? (
                        <label className="faith-check-row">
                          <input checked={Boolean(entry.applyDone)} type="checkbox" onChange={(event) => void handleApplyDone(entry, event.target.checked)} />
                          <span>적용 실천</span>
                        </label>
                      ) : null}
                    </article>
                  )) : <EmptyState>{entries.length ? '검색 조건에 맞는 묵상이 없습니다.' : '저장된 묵상이 없습니다.'}</EmptyState>}
                </div>
              </section>
            ) : null}

            {devotionView === 'detail' && selectedEntry ? (
              <article className="faith-detail">
                <div className="faith-section-head">
                  <button className="faith-text-button" type="button" onClick={() => setDevotionView('records')}>목록</button>
                  <div className="faith-icon-group">
                    <button aria-label="묵상 수정" className="faith-icon-button" type="button" onClick={() => startEdit(selectedEntry)}><Icon name="edit" /></button>
                    <button aria-label="묵상 삭제" className="faith-icon-button" type="button" onClick={() => void handleDeleteEntry(selectedEntry)}><Icon name="close" /></button>
                  </div>
                </div>
                <time>{formatDateLabel(selectedEntry.selectedDate)}</time>
                <h3>{getEntryTitle(selectedEntry)}</h3>
                <p className="faith-muted">{selectedEntry.reference} · {getAudienceLabel(selectedEntry.audience)}</p>
                <blockquote>{selectedEntry.verseText}</blockquote>
                {selectedEntry.apply ? <section><h4>오늘의 적용</h4><p>{selectedEntry.apply}</p></section> : null}
                {selectedEntry.prayer ? <section><h4>나의 기도</h4><p>{selectedEntry.prayer}</p></section> : null}
                {selectedEntry.mind ? <section><h4>묵상 메모</h4><p>{selectedEntry.mind}</p></section> : null}
              </article>
            ) : null}
          </section>
        ) : null}

        {activeTab === 'prayer' ? (
          <section className="faith-stack">
            {prayerView === 'write' ? (
              <section className="faith-panel">
                <div className="faith-section-head">
                  <h3>기도제목 작성</h3>
                  <button className="faith-text-button" type="button" onClick={() => setPrayerView('list')}>취소</button>
                </div>
                <label className="faith-field"><span>제목</span><input value={prayerTitle} onChange={(event) => setPrayerTitle(event.target.value)} /></label>
                <label className="faith-field"><span>내용</span><textarea rows={6} value={prayerBody} onChange={(event) => setPrayerBody(event.target.value)} /></label>
                <button className="faith-primary" disabled={!currentUser || (!prayerTitle.trim() && !prayerBody.trim())} type="button" onClick={() => void handlePrayerSave()}>올리기</button>
              </section>
            ) : (
              <div className="faith-list">
                {prayerRequests.length ? prayerRequests.map((request) => (
                  <article className="faith-prayer-post" key={request.id}>
                    <div className="faith-meta"><strong>{request.authorName || authorName}</strong><time>{formatDateTime(request.createdAt)}</time></div>
                    <h3>{request.title}</h3>
                    {request.body ? <p>{request.body}</p> : null}
                    <ReactionRow
                      commentCount={prayerComments[request.id]?.length ?? request.commentCount ?? 0}
                      onComment={() => setExpandedPrayerId((currentId) => currentId === request.id ? '' : request.id)}
                      onPrayer={() => void handlePrayerToggle(request)}
                      prayerCount={request.prayerCount ?? 0}
                      pressed={Boolean(prayerReactionMap[request.id])}
                    />
                    {expandedPrayerId === request.id ? (
                      <section className="faith-comments" aria-label="댓글">
                        {(prayerComments[request.id] ?? []).map((comment) => (
                          <article key={comment.id}>
                            <div><strong>{comment.authorName}</strong><time>{formatDateTime(comment.createdAt)}</time></div>
                            <p>{comment.body}</p>
                            {comment.authorUid === currentUser?.uid ? <button type="button" onClick={() => void handleDeleteComment(request.id, comment)}>삭제</button> : null}
                          </article>
                        ))}
                        <div className="faith-comment-composer">
                          <input
                            placeholder="댓글 쓰기"
                            value={commentDrafts[request.id] ?? ''}
                            onChange={(event) => setCommentDrafts((drafts) => ({ ...drafts, [request.id]: event.target.value }))}
                          />
                          <button aria-label="댓글 등록" type="button" onClick={() => void handleCommentSave(request.id)}><Icon name="send" /></button>
                        </div>
                      </section>
                    ) : null}
                  </article>
                )) : <EmptyState>등록된 기도제목이 없습니다.</EmptyState>}
              </div>
            )}
          </section>
        ) : null}

        {activeTab === 'qna' ? (
          <section className="faith-stack">
            {qnaView === 'write' ? (
              <section className="faith-panel">
                <div className="faith-section-head">
                  <h3>질문 작성</h3>
                  <button className="faith-text-button" type="button" onClick={() => setQnaView('list')}>취소</button>
                </div>
                <label className="faith-field"><span>제목</span><input value={questionTitle} onChange={(event) => setQuestionTitle(event.target.value)} /></label>
                <label className="faith-field"><span>내용</span><textarea rows={7} value={questionBody} onChange={(event) => setQuestionBody(event.target.value)} /></label>
                <div className="faith-tag-editor">
                  <div className="faith-tags">
                    {selectedQuestionTags.map((tag) => (
                      <button key={tag} type="button" onClick={() => setSelectedQuestionTags((tags) => tags.filter((item) => item !== tag))}>#{tag}</button>
                    ))}
                  </div>
                  <label className="faith-field">
                    <span>해시태그</span>
                    <input
                      autoComplete="off"
                      value={questionTagInput}
                      onChange={(event) => setQuestionTagInput(event.target.value)}
                      onCompositionEnd={() => setIsComposingTag(false)}
                      onCompositionStart={() => setIsComposingTag(true)}
                      onKeyDown={handleTagKeyDown}
                    />
                  </label>
                  {questionTagInput || tagSuggestions.length ? (
                    <div className="faith-suggestions" role="listbox">
                      {(tagSuggestions.length ? tagSuggestions : normalizeFaithTags([questionTagInput])).map((tag, index) => (
                        <button aria-selected={index === suggestionIndex} key={tag} role="option" type="button" onClick={() => addQuestionTag(tag)}>#{tag}</button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <section className="faith-related">
                  <h4>같은 태그 질문</h4>
                  {relatedQuestions.length ? relatedQuestions.map((question) => <p key={question.id}>{question.title}</p>) : <EmptyState>같은 태그의 기존 질문이 없습니다.</EmptyState>}
                </section>
                <button className="faith-primary" disabled={!currentUser || (!questionTitle.trim() && !questionBody.trim())} type="button" onClick={() => void handleQuestionSave()}>질문 올리기</button>
              </section>
            ) : (
              <>
                <div className="faith-search-row">
                  <label><Icon name="search" /><input placeholder="질문 검색" value={qnaSearch} onChange={(event) => setQnaSearch(event.target.value)} /></label>
                </div>
                {allQuestionTags.length ? (
                  <div className="faith-tags">
                    {allQuestionTags.map((tag) => <button aria-pressed={qnaTagFilter === tag} key={tag} type="button" onClick={() => setQnaTagFilter((current) => current === tag ? '' : tag)}>#{tag}</button>)}
                  </div>
                ) : null}
                <div className="faith-list">
                  {filteredQuestions.length ? filteredQuestions.map((question) => (
                    <article className="faith-question-post" key={question.id}>
                      <h3>{question.title}</h3>
                      <p>{question.body}</p>
                      <div className="faith-tags">{question.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
                      <div className="faith-meta"><strong>{question.authorName || authorName}</strong><span>답변 {question.answerCount ?? 0}</span></div>
                    </article>
                  )) : <EmptyState>{faithQuestions.length ? '조건에 맞는 질문이 없습니다.' : '아직 올라온 질문이 없습니다.'}</EmptyState>}
                </div>
              </>
            )}
          </section>
        ) : null}

        {activeTab === 'profile' ? (
          <section className="faith-stack">
            <section className="faith-profile">
              <Icon name="brand-app" />
              <div>
                <h3>{authorName}</h3>
                <p>묵상 {entries.length} · 사진 {crossPhotos.length} · 기도/질문 {prayerRequests.length + faithQuestions.length}</p>
              </div>
            </section>
            <div className="faith-week" aria-label="주간 날짜 선택">
              {weekDates.map((date) => {
                const dateKey = [
                  date.getFullYear(),
                  String(date.getMonth() + 1).padStart(2, '0'),
                  String(date.getDate()).padStart(2, '0'),
                ].join('-')
                const count = entries.filter((entry) => entry.selectedDate === dateKey).length

                return (
                  <button aria-pressed={dateKey === selectedDate} key={dateKey} type="button" onClick={() => setSelectedDate(dateKey)}>
                    <span>{new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'Asia/Seoul' }).format(date)}</span>
                    <strong>{date.getDate()}</strong>
                    <em>{count}</em>
                  </button>
                )
              })}
            </div>
            <section className="faith-panel">
              <div className="faith-tabs" role="tablist" aria-label="내 기록 필터">
                <button aria-selected role="tab" type="button">묵상</button>
                <button aria-selected={false} role="tab" type="button" onClick={() => setActiveTab('feed')}>사진</button>
                <button aria-selected={false} role="tab" type="button" onClick={() => setActiveTab('prayer')}>기도·질문</button>
              </div>
              <div className="faith-record-list">
                {entries.filter((entry) => entry.selectedDate === selectedDate).map((entry) => (
                  <article className="faith-record-row" key={entry.id}>
                    <button type="button" onClick={() => {
                      setActiveTab('devotion')
                      setSelectedEntryId(entry.id)
                      setDevotionView('detail')
                    }}>
                      <time>{formatDateLabel(entry.selectedDate)}</time>
                      <strong>{getEntryTitle(entry)}</strong>
                      <span>{entry.reference}</span>
                    </button>
                  </article>
                ))}
                {entries.every((entry) => entry.selectedDate !== selectedDate) ? <EmptyState>선택한 날짜의 기록이 없습니다.</EmptyState> : null}
              </div>
            </section>
          </section>
        ) : null}
      </main>

      <nav className="faith-bottom-nav" aria-label="MOA Faith">
        {tabs.map((tab) => (
          <button aria-current={activeTab === tab.id ? 'page' : undefined} key={tab.id} type="button" onClick={() => handleTabChange(tab.id)}>
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </section>
  )
}

function ReactionRow({
  commentCount,
  onComment,
  onPrayer,
  prayerCount,
  pressed = false,
}: {
  commentCount: number
  onComment: () => void
  onPrayer?: () => void
  prayerCount: number
  pressed?: boolean
}) {
  return (
    <div className="faith-reaction-row">
      <button
        aria-label={pressed ? '기도 참여 취소' : '기도 참여'}
        aria-pressed={pressed}
        className="faith-reaction"
        disabled={!onPrayer}
        type="button"
        onClick={onPrayer}
      >
        <Icon name={pressed ? 'prayer-filled' : 'prayer'} />
        <span>{prayerCount}</span>
      </button>
      <button aria-label="댓글 보기" className="faith-reaction" type="button" onClick={onComment}>
        <Icon name="comment" />
        <span>{commentCount}</span>
      </button>
    </div>
  )
}
