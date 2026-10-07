import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Edit3,
  Heart,
  HelpCircle,
  ImageUp,
  HandHeart,
  Lock,
  MessageCircleHeart,
  Music2,
  Play,
  Save,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { FirebaseError } from 'firebase/app'
import { get, onValue, push, ref, remove, serverTimestamp, set } from 'firebase/database'
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getFirebaseAuth, getFirebaseStorage, getRealtimeDb } from '../../services/firebase'

const LOCAL_STORAGE_KEY = 'moa.meditation.entries.v3'

type Audience = 'private' | 'public' | 'group'
type LuminaryTab = 'feed' | 'devotion' | 'prayer' | 'qna' | 'profile'
type DevotionView = 'today' | 'read' | 'write' | 'records' | 'detail' | 'edit'
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
  language?: string
  translation?: string
  book?: string
  chapters?: Record<string, Record<string, string>>
}

type MeditationEntry = {
  id: string
  apply: string
  audience: Audience
  createdAt: string
  mind: string
  mood: string
  reference: string
  selectedDate: string
  selectedVerseNumbers: number[]
  theme: string
  verseText: string
}

type CrossPhoto = {
  id: string
  caption: string
  createdAt: string
  imageUrl: string
  selectedDate: string
  storagePath: string
}

type LunchPraiseTrack = {
  id: string
  active?: boolean
  artist: string
  audioUrl?: string
  title: string
}

type PrayerRequest = {
  id: string
  body: string
  createdAt: string
  isAnswered: boolean
  title: string
}

type FaithQuestion = {
  id: string
  body: string
  createdAt: string
  title: string
}

const moods = ['고요함', '감사함', '무거움', '기대함', '회복']

const luminaryTabs: Array<{
  icon: typeof MessageCircleHeart
  id: LuminaryTab
  label: string
}> = [
  { icon: Camera, id: 'feed', label: '피드' },
  { icon: BookOpenText, id: 'devotion', label: '묵상' },
  { icon: HandHeart, id: 'prayer', label: '기도제목' },
  { icon: HelpCircle, id: 'qna', label: '신앙Q&A' },
  { icon: Settings, id: 'profile', label: '내프로필' },
]

const fallbackLunchPraiseTracks: LunchPraiseTrack[] = [
  { id: 'grace', title: '은혜', artist: '손경민' },
  { id: 'way-maker', title: 'Way Maker', artist: 'Sinach' },
  { id: 'his-grace', title: '주 은혜임을', artist: '마커스워십' },
  { id: 'as-i-am', title: '내 모습 이대로', artist: '제이어스' },
  { id: 'flowers', title: '꽃들도', artist: 'Jworship' },
  { id: 'in-his-arms', title: '주 품에', artist: '어노인팅' },
  { id: 'fullness', title: '충만', artist: '지선' },
]

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
      {
        number: 6,
        text: '아무 것도 염려하지 말고 다만 모든 일에 기도와 간구로 너희 구할 것을 감사함으로 하나님께 아뢰라.',
      },
      {
        number: 7,
        text: '그리하면 모든 지각에 뛰어난 하나님의 평강이 그리스도 예수 안에서 너희 마음과 생각을 지키시리라.',
      },
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
      {
        number: 29,
        text: '피곤한 자에게는 능력을 주시며 무능한 자에게는 힘을 더하시나니',
      },
      {
        number: 30,
        text: '소년이라도 피곤하며 곤비하며 장정이라도 넘어지며 쓰러지되',
      },
      {
        number: 31,
        text: '오직 여호와를 앙망하는 자는 새 힘을 얻으리니 독수리가 날개치며 올라감 같을 것이요 달음박질하여도 곤비하지 아니하겠고 걸어가도 피곤하지 아니하리로다.',
      },
    ],
  },
]

const knownPassageText: Record<string, Verse[]> = Object.fromEntries(
  scripturePlans.map((plan) => [plan.reference, plan.verses]),
)
const scriptureBookCachePromises = new Map<string, Promise<ScriptureCache | null>>()
const scriptureLanguageOptions: Array<{
  id: ScriptureLanguage
  label: string
  translation: string
}> = [
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

function getTodayKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Seoul',
    year: 'numeric',
  }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'

  return `${year}-${month}-${day}`
}

function createLocalId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    day: 'numeric',
    month: 'long',
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
    const value = window.localStorage.getItem(LOCAL_STORAGE_KEY)

    if (!value) {
      return []
    }

    const parsed: unknown = JSON.parse(value)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((entry): entry is MeditationEntry => {
      return (
        typeof entry === 'object' &&
        entry !== null &&
        'id' in entry &&
        'mind' in entry &&
        'apply' in entry &&
        'reference' in entry &&
        'createdAt' in entry
      )
    })
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
    return {
      ...exactPlan,
      title: '랜덤 묵상 본문',
      theme: `랜덤 · ${exactPlan.theme}`,
    }
  }

  const seed = date.split('-').join('')
  const index = Number(seed) % scripturePlans.length
  const plan = scripturePlans[index]

  return {
    ...plan,
    title: '랜덤 묵상 본문',
    theme: `랜덤 · ${plan.theme}`,
  }
}

function buildReference(book: string, chapter: number, start: number, end: number) {
  const range = start === end ? String(start) : `${start}-${end}`

  return `${book} ${chapter}:${range}`
}

function normalizeFirebaseVerses(value: unknown): Verse[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const verses = value
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return null
      }

      const verse = item as Record<string, unknown>
      const number = Number(verse.number)
      const text = typeof verse.text === 'string' ? verse.text.trim() : ''

      if (!Number.isFinite(number) || !text) {
        return null
      }

      return { number, text }
    })
    .filter((item): item is Verse => item !== null)

  return verses.length ? verses : null
}

function normalizeLunchPraiseTracks(value: unknown): LunchPraiseTrack[] {
  if (!value || typeof value !== 'object') {
    return []
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([id, item]): LunchPraiseTrack | null => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const data = item as Record<string, unknown>
      const title = typeof data.title === 'string' ? data.title.trim() : ''
      const artist = typeof data.artist === 'string' ? data.artist.trim() : 'MOA'
      const audioUrl = typeof data.audioUrl === 'string' ? data.audioUrl.trim() : ''
      const active = typeof data.active === 'boolean' ? data.active : true

      if (!title || !active) {
        return null
      }

      return {
        id,
        active,
        artist,
        audioUrl: audioUrl || undefined,
        title,
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

  const promise = fetch(`${import.meta.env.BASE_URL}scripture/${language}/${slug}.json`, {
    cache: 'no-cache',
  })
    .then((response) => {
      if (!response.ok) {
        return null
      }

      return response.json() as Promise<ScriptureCache>
    })
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

function planFromFirebaseRange(
  date: string,
  range: FirebaseVerseRange,
  remoteVerses?: Verse[] | null,
  translation?: string,
): ScripturePlan | null {
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
  }
}

async function fetchFirebasePlan(date: string, language: ScriptureLanguage) {
  const [year, month, day] = date.split('-')
  const dayKey = `${month}${day}`
  const snapshot = await get(ref(getRealtimeDb(), `verse/${year}/${dayKey}`))
  const value = snapshot.val() as FirebaseVerseRange[] | FirebaseVersePayload | null

  if (!value) {
    return null
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return null
    }

    const verses = await getScriptureVersesFromCache(language, value[0])
    const translation = scriptureLanguageOptions.find((option) => option.id === language)?.translation
    return planFromFirebaseRange(date, value[0], verses, translation)
  }

  const range = Array.isArray(value.range) ? value.range : null
  const verses = normalizeFirebaseVerses(value.verses)
  const translation = typeof value.translation === 'string' ? value.translation : undefined

  if (!range) {
    return null
  }

  const cachedVerses = await getScriptureVersesFromCache(language, range)
  const selectedTranslation = scriptureLanguageOptions.find((option) => option.id === language)?.translation

  return planFromFirebaseRange(date, range, cachedVerses ?? verses, selectedTranslation ?? translation)
}

function getSelectedVerseText(plan: ScripturePlan, selectedVerseNumbers: number[]) {
  const selectedSet = new Set(selectedVerseNumbers)
  const verses = selectedVerseNumbers.length
    ? plan.verses.filter((verse) => selectedSet.has(verse.number))
    : plan.verses

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

function getUserFaithQuestionsPath(userId: string) {
  return `users/${userId}/faithQuestions`
}

export function MeditationApp() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [activeTab, setActiveTab] = useState<LuminaryTab>('devotion')
  const [devotionView, setDevotionView] = useState<DevotionView>('today')
  const [selectedDate, setSelectedDate] = useState(getTodayKey)
  const [scriptureLanguage, setScriptureLanguage] = useState<ScriptureLanguage>('ko')
  const [selectedVerseNumbers, setSelectedVerseNumbers] = useState<number[]>([])
  const [remotePlan, setRemotePlan] = useState<ScripturePlan | null>(null)
  const [isPlanLoading, setIsPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [mind, setMind] = useState('')
  const [apply, setApply] = useState('')
  const [mood, setMood] = useState(moods[0])
  const [audience, setAudience] = useState<Audience>('private')
  const [entries, setEntries] = useState<MeditationEntry[]>(loadLocalEntries)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [crossPhotos, setCrossPhotos] = useState<CrossPhoto[]>([])
  const [crossCaption, setCrossCaption] = useState('')
  const [crossFile, setCrossFile] = useState<File | null>(null)
  const [isPhotoUploading, setIsPhotoUploading] = useState(false)
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([])
  const [prayerTitle, setPrayerTitle] = useState('')
  const [prayerBody, setPrayerBody] = useState('')
  const [faithQuestions, setFaithQuestions] = useState<FaithQuestion[]>([])
  const [questionTitle, setQuestionTitle] = useState('')
  const [questionBody, setQuestionBody] = useState('')
  const [lunchPraiseTracks, setLunchPraiseTracks] = useState<LunchPraiseTrack[]>(fallbackLunchPraiseTracks)
  const [trackIndex, setTrackIndex] = useState(() => Math.floor(Math.random() * fallbackLunchPraiseTracks.length))
  const [isTrackLoading, setIsTrackLoading] = useState(true)
  const [audioNotice, setAudioNotice] = useState('')
  const [syncState, setSyncState] = useState<'local' | 'syncing' | 'synced' | 'error'>(
    'local',
  )
  const [errorMessage, setErrorMessage] = useState('')
  const plan = useMemo(
    () => remotePlan ?? getPlanForDate(selectedDate),
    [remotePlan, selectedDate],
  )
  const selectedVerseText = useMemo(
    () => getSelectedVerseText(plan, selectedVerseNumbers),
    [plan, selectedVerseNumbers],
  )
  const currentUser = getFirebaseAuth().currentUser
  const completedToday = entries.some((entry) => entry.selectedDate === selectedDate)
  const activeDays = new Set(entries.map((entry) => entry.selectedDate)).size
  const canSave = Boolean(mind.trim() || apply.trim())
  const selectedDateEntries = entries.filter((entry) => entry.selectedDate === selectedDate)
  const selectedDateEntry = selectedDateEntries[0] ?? null
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null
  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return entries.filter((entry) => {
      const matchesDate = filterDate ? entry.selectedDate === filterDate : true
      const searchable = `${entry.reference} ${entry.theme} ${entry.mood} ${entry.verseText} ${entry.mind} ${entry.apply}`.toLowerCase()
      return matchesDate && (!query || searchable.includes(query))
    })
  }, [entries, filterDate, searchTerm])
  const todayKey = getTodayKey()
  const featuredCrossPhoto = crossPhotos[0] ?? null
  const playableLunchTracks = lunchPraiseTracks.filter((track) => track.audioUrl)
  const currentTrack = lunchPraiseTracks[trackIndex] ?? lunchPraiseTracks[0]
  const currentTrackSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${currentTrack?.title ?? ''} ${currentTrack?.artist ?? ''}`,
  )}`
  const weekDates = useMemo(() => {
    const baseDate = new Date(`${selectedDate}T00:00:00`)
    const startDate = new Date(baseDate)
    startDate.setDate(baseDate.getDate() - baseDate.getDay())

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + index)
      return date
    })
  }, [selectedDate])

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
        if (!active) {
          return
        }

        setRemotePlan(nextPlan)
      })
      .catch((error) => {
        if (!active) {
          return
        }

        setPlanError(
          error instanceof Error
            ? `Firebase 말씀 장절을 불러오지 못했습니다: ${error.message}`
            : 'Firebase 말씀 장절을 불러오지 못했습니다.',
        )
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
    const entriesRef = ref(getRealtimeDb(), getUserEntriesPath(currentUser.uid))
    const unsubscribe = onValue(
      entriesRef,
      (snapshot) => {
        const value = snapshot.val() as Record<string, Omit<MeditationEntry, 'id'>> | null
        const remoteEntries = value
          ? Object.entries(value)
              .map(([id, entry]) => ({ ...entry, id }))
              .sort((firstEntry, secondEntry) => {
                return Date.parse(secondEntry.createdAt) - Date.parse(firstEntry.createdAt)
              })
          : []

        setEntries(remoteEntries)
        saveLocalEntries(remoteEntries)
        setSyncState('synced')
      },
      (error) => {
        setSyncState('error')
        setErrorMessage(error.message)
      },
    )

    return unsubscribe
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) {
      setCrossPhotos([])
      setPrayerRequests([])
      setFaithQuestions([])
      return undefined
    }

    const subscriptions = [
      onValue(ref(getRealtimeDb(), getUserCrossPhotosPath(currentUser.uid)), (snapshot) => {
        const value = snapshot.val() as Record<string, Omit<CrossPhoto, 'id'>> | null
        const photos = value
          ? Object.entries(value)
              .map(([id, photo]) => ({ ...photo, id }))
              .sort((firstPhoto, secondPhoto) => Date.parse(secondPhoto.createdAt) - Date.parse(firstPhoto.createdAt))
          : []

        setCrossPhotos(photos)
      }),
      onValue(ref(getRealtimeDb(), getUserPrayerRequestsPath(currentUser.uid)), (snapshot) => {
        const value = snapshot.val() as Record<string, Omit<PrayerRequest, 'id'>> | null
        const requests = value
          ? Object.entries(value)
              .map(([id, request]) => ({ ...request, id }))
              .sort((firstRequest, secondRequest) => Date.parse(secondRequest.createdAt) - Date.parse(firstRequest.createdAt))
          : []

        setPrayerRequests(requests)
      }),
      onValue(ref(getRealtimeDb(), getUserFaithQuestionsPath(currentUser.uid)), (snapshot) => {
        const value = snapshot.val() as Record<string, Omit<FaithQuestion, 'id'>> | null
        const questions = value
          ? Object.entries(value)
              .map(([id, question]) => ({ ...question, id }))
              .sort((firstQuestion, secondQuestion) => Date.parse(secondQuestion.createdAt) - Date.parse(firstQuestion.createdAt))
          : []

        setFaithQuestions(questions)
      }),
    ]

    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe())
    }
  }, [currentUser])

  useEffect(() => {
    if (syncState !== 'synced') {
      saveLocalEntries(entries)
    }
  }, [entries, syncState])

  useEffect(() => {
    setIsTrackLoading(true)

    const unsubscribe = onValue(
      ref(getRealtimeDb(), 'lunchPraiseTracks'),
      (snapshot) => {
        const remoteTracks = normalizeLunchPraiseTracks(snapshot.val())

        setLunchPraiseTracks(remoteTracks.length ? remoteTracks : fallbackLunchPraiseTracks)
        setTrackIndex((currentIndex) => {
          const nextLength = remoteTracks.length || fallbackLunchPraiseTracks.length
          return currentIndex < nextLength ? currentIndex : 0
        })
        setIsTrackLoading(false)
      },
      () => {
        setLunchPraiseTracks(fallbackLunchPraiseTracks)
        setIsTrackLoading(false)
      },
    )

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!currentTrack?.audioUrl || !audioRef.current) {
      setAudioNotice('')
      return
    }

    const audio = audioRef.current
    audio.load()
    const playPromise = audio.play()

    if (!playPromise) {
      return
    }

    playPromise
      .then(() => setAudioNotice(''))
      .catch(() => setAudioNotice('브라우저 자동 재생이 차단됐습니다. 재생 버튼을 누르세요.'))
  }, [currentTrack?.audioUrl, currentTrack?.id])

  function handleBackHome() {
    history.pushState('', document.title, window.location.pathname + window.location.search)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }

  function toggleVerse(verseNumber: number) {
    setSelectedVerseNumbers((currentNumbers) => {
      if (currentNumbers.includes(verseNumber)) {
        return currentNumbers.filter((number) => number !== verseNumber)
      }

      return [...currentNumbers, verseNumber].sort((first, second) => first - second)
    })
  }

  async function handleSave() {
    if (!canSave || isSaving) {
      return
    }

    const localId = createLocalId()
    const entry: MeditationEntry = {
      id: localId,
      apply: apply.trim(),
      audience,
      createdAt: new Date().toISOString(),
      mind: mind.trim(),
      mood,
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
          apply: savedEntry.apply,
          audience: savedEntry.audience,
          mind: savedEntry.mind,
          mood: savedEntry.mood,
          reference: savedEntry.reference,
          selectedDate: savedEntry.selectedDate,
          selectedVerseNumbers: savedEntry.selectedVerseNumbers,
          theme: savedEntry.theme,
          verseText: savedEntry.verseText,
          createdAt: savedEntry.createdAt,
          createdAtMs: serverTimestamp(),
        })
      } else {
        setEntries((currentEntries) => [entry, ...currentEntries].slice(0, 30))
      }

      setMind('')
      setApply('')
      setSelectedEntryId(savedEntry.id)
      setDevotionView('detail')
      setStatusMessage('묵상을 저장했습니다.')
    } catch (error) {
      setSyncState('error')
      setErrorMessage(
        error instanceof FirebaseError
          ? error.message
          : '저장하지 못했습니다. 작성 내용은 그대로 두었습니다.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  function startWriting() {
    setMind('')
    setApply('')
    setMood(moods[0])
    setAudience('private')
    setDevotionView('write')
  }

  function startEdit(entry: MeditationEntry) {
    setSelectedEntryId(entry.id)
    setSelectedDate(entry.selectedDate)
    setSelectedVerseNumbers(entry.selectedVerseNumbers)
    setMind(entry.mind)
    setApply(entry.apply)
    setMood(entry.mood)
    setAudience(entry.audience)
    setDevotionView('edit')
  }

  async function handleUpdate() {
    if (!selectedEntry || !canSave || isSaving) {
      return
    }

    const updatedEntry: MeditationEntry = {
      ...selectedEntry,
      apply: apply.trim(),
      audience,
      mind: mind.trim(),
      mood,
      selectedVerseNumbers,
      verseText: selectedVerseText,
    }

    setIsSaving(true)
    setErrorMessage('')
    setStatusMessage('')

    try {
      if (currentUser && syncState === 'synced') {
        await set(ref(getRealtimeDb(), `${getUserEntriesPath(currentUser.uid)}/${selectedEntry.id}`), {
          apply: updatedEntry.apply,
          audience: updatedEntry.audience,
          mind: updatedEntry.mind,
          mood: updatedEntry.mood,
          reference: updatedEntry.reference,
          selectedDate: updatedEntry.selectedDate,
          selectedVerseNumbers: updatedEntry.selectedVerseNumbers,
          theme: updatedEntry.theme,
          verseText: updatedEntry.verseText,
          createdAt: updatedEntry.createdAt,
          updatedAt: new Date().toISOString(),
          updatedAtMs: serverTimestamp(),
        })
      } else {
        setEntries((currentEntries) =>
          currentEntries.map((entry) => (entry.id === selectedEntry.id ? updatedEntry : entry)),
        )
      }

      setSelectedEntryId(updatedEntry.id)
      setDevotionView('detail')
      setStatusMessage('수정 내용을 저장했습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '수정 내용을 저장하지 못했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(entry: MeditationEntry) {
    if (!window.confirm(`${formatDateLabel(entry.selectedDate)}의 묵상 기록을 삭제할까요?`)) {
      return
    }

    if (currentUser && syncState === 'synced') {
      await remove(ref(getRealtimeDb(), `${getUserEntriesPath(currentUser.uid)}/${entry.id}`))
      setDevotionView('records')
      setSelectedEntryId('')
      return
    }

    setEntries((currentEntries) => currentEntries.filter((currentEntry) => currentEntry.id !== entry.id))
    setDevotionView('records')
    setSelectedEntryId('')
  }

  async function handleCrossPhotoUpload() {
    if (!currentUser || !crossFile || isPhotoUploading) {
      return
    }

    setIsPhotoUploading(true)
    setErrorMessage('')

    try {
      const extension = crossFile.name.split('.').pop() || 'webp'
      const path = `users/${currentUser.uid}/photos/cross-${todayKey}-${createLocalId()}.${extension}`
      const uploadTask = uploadBytesResumable(storageRef(getFirebaseStorage(), path), crossFile, {
        contentType: crossFile.type,
      })
      await uploadTask
      const imageUrl = await getDownloadURL(uploadTask.snapshot.ref)
      const photoRef = push(ref(getRealtimeDb(), getUserCrossPhotosPath(currentUser.uid)))

      await set(photoRef, {
        caption: crossCaption.trim(),
        createdAt: new Date().toISOString(),
        createdAtMs: serverTimestamp(),
        imageUrl,
        selectedDate: todayKey,
        storagePath: path,
      })
      setCrossCaption('')
      setCrossFile(null)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? `사진 업로드에 실패했습니다: ${error.message}` : '사진 업로드에 실패했습니다.',
      )
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
      body: prayerBody.trim(),
      createdAt: new Date().toISOString(),
      createdAtMs: serverTimestamp(),
      isAnswered: false,
      title: prayerTitle.trim() || '기도제목',
    })
    setPrayerTitle('')
    setPrayerBody('')
  }

  async function handleQuestionSave() {
    if (!currentUser || (!questionTitle.trim() && !questionBody.trim())) {
      return
    }

    const questionRef = push(ref(getRealtimeDb(), getUserFaithQuestionsPath(currentUser.uid)))
    await set(questionRef, {
      body: questionBody.trim(),
      createdAt: new Date().toISOString(),
      createdAtMs: serverTimestamp(),
      title: questionTitle.trim() || '신앙 질문',
    })
    setQuestionTitle('')
    setQuestionBody('')
  }

  function handleNextTrack() {
    setTrackIndex((currentIndex) => {
      if (lunchPraiseTracks.length <= 1) {
        return 0
      }

      const offset = 1 + Math.floor(Math.random() * (lunchPraiseTracks.length - 1))
      return (currentIndex + offset) % lunchPraiseTracks.length
    })
  }

  return (
    <section className="sub-app meditation-screen">
      <header className="meditation-header">
        <button aria-label="앱 목록으로 돌아가기" className="nav-icon-button" type="button" onClick={handleBackHome}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <div>
          <span className="meditation-kicker">MOA Faith</span>
          <h2>{activeTab === 'feed' ? '피드' : activeTab === 'devotion' ? '묵상' : activeTab === 'prayer' ? '기도제목' : activeTab === 'qna' ? '신앙 Q&A' : '내프로필'}</h2>
        </div>
        <div className="meditation-streak" aria-label="묵상 활동일">
          <strong>{activeDays}</strong>
          <span>활동일</span>
        </div>
      </header>

      <nav className="meditation-section-tabs" aria-label="MOA Faith">
        {luminaryTabs.map((tab) => {
          const Icon = tab.icon

          return (
            <button
              className={activeTab === tab.id ? 'is-selected' : undefined}
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'devotion') {
                  setDevotionView('today')
                }
              }}
            >
              <Icon aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {activeTab === 'devotion' ? (
        <section className="meditation-devotion">
          <div className="meditation-topbar">
            <label>
              <CalendarDays aria-hidden="true" />
              <span>날짜</span>
              <input
                max="2099-12-31"
                min="2020-01-01"
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value)
                  setDevotionView('today')
                }}
              />
            </label>
            <span className={`meditation-sync meditation-sync-${syncState}`}>
              {syncState === 'synced'
                ? '동기화됨'
                : syncState === 'syncing'
                  ? '동기화 중'
                  : syncState === 'error'
                    ? '연결 불안정'
                    : '로컬 모드'}
            </span>
          </div>

          {errorMessage ? <p className="meditation-error">{errorMessage}</p> : null}
          {statusMessage ? <p className="meditation-success">{statusMessage}</p> : null}

          {devotionView === 'today' ? (
            <>
              <section className="meditation-today-card" aria-labelledby="today-devotion-title">
                <div className="meditation-date-line">{formatDateLabel(selectedDate)}</div>
                <div>
                  <span className="meditation-kicker">오늘의 말씀</span>
                  <h3 id="today-devotion-title">{plan.title}</h3>
                  <p>{plan.reference}</p>
                </div>
                <blockquote>{isPlanLoading ? '말씀을 불러오는 중입니다.' : selectedVerseText}</blockquote>
                {planError ? <p className="meditation-error">{planError}</p> : null}
                <div className="meditation-primary-actions">
                  {selectedDateEntry ? (
                    <button
                      className="meditation-primary-button"
                      type="button"
                      onClick={() => {
                        setSelectedEntryId(selectedDateEntry.id)
                        setDevotionView('detail')
                      }}
                    >
                      묵상 다시 보기
                      <ChevronRight aria-hidden="true" />
                    </button>
                  ) : mind.trim() || apply.trim() ? (
                    <button className="meditation-primary-button" type="button" onClick={() => setDevotionView('write')}>
                      이어서 작성하기
                      <ChevronRight aria-hidden="true" />
                    </button>
                  ) : (
                    <button className="meditation-primary-button" type="button" onClick={() => setDevotionView('read')}>
                      묵상 시작하기
                      <ChevronRight aria-hidden="true" />
                    </button>
                  )}
                  <button className="meditation-secondary-button" type="button" onClick={() => setDevotionView('records')}>
                    내 기록
                  </button>
                </div>
              </section>

              <div className="meditation-calendar-strip" aria-label="묵상 날짜">
                {weekDates.map((date) => {
                  const dateKey = [
                    date.getFullYear(),
                    String(date.getMonth() + 1).padStart(2, '0'),
                    String(date.getDate()).padStart(2, '0'),
                  ].join('-')
                  const isSelected = dateKey === selectedDate
                  const hasEntry = entries.some((entry) => entry.selectedDate === dateKey)

                  return (
                    <button
                      className={isSelected ? 'is-selected' : undefined}
                      key={dateKey}
                      type="button"
                      onClick={() => {
                        setSelectedDate(dateKey)
                        setDevotionView('today')
                      }}
                    >
                      <span>{new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date)}</span>
                      <strong>{date.getDate()}</strong>
                      {hasEntry ? <i aria-label="기록 있음" /> : <em />}
                    </button>
                  )
                })}
              </div>

              <section className="meditation-list-section" aria-labelledby="recent-devotions-title">
                <div className="meditation-panel-heading">
                  <div>
                    <span className="meditation-kicker">최근 내 기록</span>
                    <h3 id="recent-devotions-title">다시 읽기</h3>
                  </div>
                  <button className="meditation-text-button" type="button" onClick={() => setDevotionView('records')}>
                    전체 보기
                  </button>
                </div>
                {entries.length ? (
                  <div className="meditation-record-list">
                    {entries.slice(0, 4).map((entry) => (
                      <button
                        className="meditation-record-row"
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          setSelectedEntryId(entry.id)
                          setDevotionView('detail')
                        }}
                      >
                        <time>{formatDateLabel(entry.selectedDate)}</time>
                        <strong>{getEntryTitle(entry)}</strong>
                        <span>{entry.reference}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="meditation-empty">아직 저장된 묵상이 없습니다. 오늘 말씀부터 천천히 시작해보세요.</p>
                )}
              </section>
            </>
          ) : null}

          {devotionView === 'read' ? (
            <section className="meditation-reading-panel" aria-labelledby="meditation-read-title">
              <div className="meditation-panel-heading">
                <div>
                  <span className="meditation-kicker">{plan.reference}</span>
                  <h3 id="meditation-read-title">{plan.title}</h3>
                </div>
                <button className="meditation-text-button" type="button" onClick={() => setDevotionView('today')}>
                  오늘로
                </button>
              </div>
              <div className="meditation-language-row" aria-label="말씀 언어">
                {scriptureLanguageOptions.map((option) => (
                  <button
                    className={scriptureLanguage === option.id ? 'is-selected' : undefined}
                    key={option.id}
                    title={option.translation}
                    type="button"
                    onClick={() => setScriptureLanguage(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="meditation-verse-list">
                {isPlanLoading ? (
                  <p className="meditation-empty">말씀을 불러오고 있습니다.</p>
                ) : (
                  plan.verses.map((verse) => (
                    <button
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
              <p className="meditation-question">{plan.question}</p>
              <button className="meditation-primary-button" type="button" onClick={startWriting}>
                묵상 기록하기
                <ChevronRight aria-hidden="true" />
              </button>
            </section>
          ) : null}

          {devotionView === 'write' || devotionView === 'edit' ? (
            <section className="meditation-writing-panel meditation-writing-screen" aria-labelledby="meditation-writing-title">
              <div className="meditation-panel-heading">
                <div>
                  <span className="meditation-kicker">{plan.reference}</span>
                  <h3 id="meditation-writing-title">{devotionView === 'edit' ? '묵상 수정' : '묵상 기록'}</h3>
                </div>
                {completedToday && devotionView !== 'edit' ? (
                  <span className="meditation-complete">
                    <Check aria-hidden="true" />
                    오늘 기록 있음
                  </span>
                ) : null}
              </div>
              <div className="meditation-focus">
                <strong>마음에 남은 말씀</strong>
                <p>{selectedVerseText}</p>
              </div>
              <div className="meditation-mood-row" aria-label="오늘 마음">
                {moods.map((itemMood) => (
                  <button
                    className={mood === itemMood ? 'is-selected' : undefined}
                    key={itemMood}
                    type="button"
                    onClick={() => setMood(itemMood)}
                  >
                    <Heart aria-hidden="true" />
                    <span>{itemMood}</span>
                  </button>
                ))}
              </div>
              <label className="meditation-textarea-label">
                <span>나의 묵상</span>
                <textarea
                  onChange={(event) => setMind(event.target.value)}
                  placeholder="말씀을 읽으며 떠오른 생각과 마음을 적어보세요."
                  rows={8}
                  value={mind}
                />
              </label>
              <label className="meditation-textarea-label">
                <span>오늘의 적용</span>
                <textarea
                  onChange={(event) => setApply(event.target.value)}
                  placeholder="오늘 실천할 한 가지를 짧게 적어보세요."
                  rows={5}
                  value={apply}
                />
              </label>
              <div className="meditation-audience-row" aria-label="공개 범위">
                {[
                  { icon: Lock, id: 'private', label: '나만 보기' },
                  { icon: Sparkles, id: 'public', label: '전체 공개' },
                  { icon: Users, id: 'group', label: '그룹 공개' },
                ].map((item) => {
                  const Icon = item.icon

                  return (
                    <button
                      className={audience === item.id ? 'is-selected' : undefined}
                      key={item.id}
                      type="button"
                      onClick={() => setAudience(item.id as Audience)}
                    >
                      <Icon aria-hidden="true" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
              <div className="meditation-writing-actions">
                <span>{mind.trim().length + apply.trim().length}자</span>
                <div>
                  <button className="meditation-secondary-button" type="button" onClick={() => setDevotionView(devotionView === 'edit' ? 'detail' : 'today')}>
                    취소
                  </button>
                  <button
                    className="meditation-primary-button"
                    disabled={!canSave || isSaving}
                    type="button"
                    onClick={() => void (devotionView === 'edit' ? handleUpdate() : handleSave())}
                  >
                    <Save aria-hidden="true" />
                    <span>{isSaving ? '저장 중' : '저장'}</span>
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {devotionView === 'records' ? (
            <section className="meditation-list-section" aria-labelledby="records-title">
              <div className="meditation-panel-heading">
                <div>
                  <span className="meditation-kicker">내 기록</span>
                  <h3 id="records-title">날짜별 묵상</h3>
                </div>
                <button className="meditation-primary-button" type="button" onClick={() => setDevotionView('read')}>
                  새 묵상
                </button>
              </div>
              <div className="meditation-record-tools">
                <label>
                  <Search aria-hidden="true" />
                  <input
                    placeholder="말씀, 묵상 내용 검색"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </label>
                <input type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} />
              </div>
              {entries.length === 0 ? (
                <p className="meditation-empty">저장된 묵상이 없습니다.</p>
              ) : filteredEntries.length === 0 ? (
                <p className="meditation-empty">검색 조건에 맞는 묵상이 없습니다.</p>
              ) : (
                <div className="meditation-record-list">
                  {filteredEntries.map((entry) => (
                    <button
                      className="meditation-record-row"
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setSelectedEntryId(entry.id)
                        setDevotionView('detail')
                      }}
                    >
                      <time>{formatDateLabel(entry.selectedDate)}</time>
                      <strong>{getEntryTitle(entry)}</strong>
                      <span>
                        {entry.reference} · {getAudienceLabel(entry.audience)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {devotionView === 'detail' && selectedEntry ? (
            <article className="meditation-detail" aria-labelledby="entry-detail-title">
              <div className="meditation-detail-header">
                <button className="meditation-text-button" type="button" onClick={() => setDevotionView('records')}>
                  내 기록
                </button>
                <div>
                  <span className="meditation-kicker">{formatDateLabel(selectedEntry.selectedDate)}</span>
                  <h3 id="entry-detail-title">{getEntryTitle(selectedEntry)}</h3>
                  <p>{selectedEntry.reference} · {getAudienceLabel(selectedEntry.audience)}</p>
                </div>
                <div className="meditation-detail-actions">
                  <button aria-label="묵상 수정" type="button" onClick={() => startEdit(selectedEntry)}>
                    <Edit3 aria-hidden="true" />
                  </button>
                  <button aria-label="묵상 삭제" type="button" onClick={() => void handleDelete(selectedEntry)}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </div>
              <blockquote>{selectedEntry.verseText}</blockquote>
              {selectedEntry.mind ? (
                <section>
                  <h4>나의 묵상</h4>
                  <p>{selectedEntry.mind}</p>
                </section>
              ) : null}
              {selectedEntry.apply ? (
                <section>
                  <h4>오늘의 적용</h4>
                  <p>{selectedEntry.apply}</p>
                </section>
              ) : null}
              <small>{formatDateTime(selectedEntry.createdAt)} 저장</small>
            </article>
          ) : null}
        </section>
      ) : (
        <section className="meditation-tab-panel">
          {activeTab === 'feed' ? (
            <>
              <section className="meditation-feed-hero" aria-labelledby="faith-feed-title">
                <div>
                  <span className="meditation-kicker">Faith feed</span>
                  <h3 id="faith-feed-title">십자가를 발견한 순간들</h3>
                  <p>올린 사진은 Firebase Storage에 저장되고, 피드에는 URL과 문장이 함께 전시됩니다.</p>
                </div>
                <span className="meditation-complete">{crossPhotos.length}장</span>
              </section>

              {featuredCrossPhoto ? (
                <article className="meditation-photo-card meditation-featured-photo">
                  <img alt={featuredCrossPhoto.caption || '십자가 사진'} src={featuredCrossPhoto.imageUrl} />
                  <div>
                    <strong>{featuredCrossPhoto.caption || '십자가를 발견한 순간'}</strong>
                    <p>{featuredCrossPhoto.selectedDate}</p>
                  </div>
                </article>
              ) : null}

              <div className="meditation-feed-grid">
                <section className="meditation-upload-card" aria-label="십자가 사진 업로드">
                  <div className="meditation-panel-heading">
                    <div>
                      <span className="meditation-kicker">Upload</span>
                      <h3>사진 올리기</h3>
                    </div>
                  </div>
                  <label>
                    <ImageUp aria-hidden="true" />
                    <span>{crossFile ? crossFile.name : '이미지 선택'}</span>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      type="file"
                      onChange={(event) => setCrossFile(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  <input
                    maxLength={80}
                    placeholder="사진에 남길 짧은 문장"
                    value={crossCaption}
                    onChange={(event) => setCrossCaption(event.target.value)}
                  />
                  <button
                    disabled={!currentUser || !crossFile || isPhotoUploading}
                    type="button"
                    onClick={() => void handleCrossPhotoUpload()}
                  >
                    <Camera aria-hidden="true" />
                    <span>{isPhotoUploading ? '업로드 중' : '피드에 올리기'}</span>
                  </button>
                </section>

                <section className="meditation-track-card" aria-label="오찬추">
                  <Music2 aria-hidden="true" />
                  <div>
                    <span>{isTrackLoading ? '불러오는 중' : `${playableLunchTracks.length}개 URL 재생 가능`}</span>
                    <strong>{currentTrack?.title ?? '오찬추'}</strong>
                    <small>{currentTrack?.artist ?? 'Firebase에 찬양 URL을 등록하세요.'}</small>
                  </div>
                  {currentTrack?.audioUrl ? (
                    <audio controls key={currentTrack.id} playsInline ref={audioRef} src={currentTrack.audioUrl}>
                      <track kind="captions" />
                    </audio>
                  ) : null}
                  {audioNotice ? <p className="meditation-inline-note">{audioNotice}</p> : null}
                  <div className="meditation-track-actions">
                    <button type="button" onClick={handleNextTrack}>
                      <Sparkles aria-hidden="true" />
                      <span>랜덤</span>
                    </button>
                    {currentTrack?.audioUrl ? (
                      <a href={currentTrack.audioUrl} rel="noreferrer" target="_blank">
                        <Play aria-hidden="true" />
                        <span>열기</span>
                      </a>
                    ) : (
                      <a href={currentTrackSearchUrl} rel="noreferrer" target="_blank">
                        <Play aria-hidden="true" />
                        <span>검색</span>
                      </a>
                    )}
                  </div>
                </section>
              </div>

              {errorMessage ? <p className="meditation-error">{errorMessage}</p> : null}
              <div className="meditation-photo-grid">
                {crossPhotos.length ? (
                  crossPhotos.slice(0, 12).map((photo) => (
                    <article className="meditation-photo-tile" key={photo.id}>
                      <img alt={photo.caption || '십자가 사진'} src={photo.imageUrl} />
                      <span>{photo.caption || photo.selectedDate}</span>
                    </article>
                  ))
                ) : (
                  <p className="meditation-empty">아직 전시된 사진이 없습니다.</p>
                )}
              </div>
            </>
          ) : null}

          {activeTab === 'prayer' ? (
            <>
              <div className="meditation-panel-heading">
                <div>
                  <span className="meditation-kicker">중보기도</span>
                  <h3>기도제목</h3>
                </div>
                <span className="meditation-complete">{prayerRequests.length}개</span>
              </div>
              <div className="meditation-compact-form">
                <input
                  placeholder="제목"
                  value={prayerTitle}
                  onChange={(event) => setPrayerTitle(event.target.value)}
                />
                <textarea
                  placeholder="함께 기도할 내용을 적어주세요."
                  rows={4}
                  value={prayerBody}
                  onChange={(event) => setPrayerBody(event.target.value)}
                />
                <button
                  disabled={!currentUser || (!prayerTitle.trim() && !prayerBody.trim())}
                  type="button"
                  onClick={() => void handlePrayerSave()}
                >
                  <Send aria-hidden="true" />
                  <span>올리기</span>
                </button>
              </div>
              <div className="meditation-entry-list">
                {prayerRequests.length ? (
                  prayerRequests.map((request) => (
                    <article className="meditation-entry" key={request.id}>
                      <div>
                        <strong>{request.title}</strong>
                        <span>{formatDateTime(request.createdAt)}</span>
                      </div>
                      <p>{request.body}</p>
                    </article>
                  ))
                ) : (
                  <p className="meditation-empty">등록된 기도제목이 없습니다.</p>
                )}
              </div>
            </>
          ) : null}

          {activeTab === 'qna' ? (
            <>
              <div className="meditation-panel-heading">
                <div>
                  <span className="meditation-kicker">신앙 Q&A</span>
                  <h3>질문을 모아두는 공간</h3>
                </div>
                <span className="meditation-complete">{faithQuestions.length}개</span>
              </div>
              <div className="meditation-compact-form">
                <input
                  placeholder="질문 제목"
                  value={questionTitle}
                  onChange={(event) => setQuestionTitle(event.target.value)}
                />
                <textarea
                  placeholder="말씀, 신앙생활, 공동체에 대한 질문을 적어주세요."
                  rows={5}
                  value={questionBody}
                  onChange={(event) => setQuestionBody(event.target.value)}
                />
                <button
                  disabled={!currentUser || (!questionTitle.trim() && !questionBody.trim())}
                  type="button"
                  onClick={() => void handleQuestionSave()}
                >
                  <Send aria-hidden="true" />
                  <span>질문 올리기</span>
                </button>
              </div>
              <div className="meditation-entry-list">
                {faithQuestions.length ? (
                  faithQuestions.map((question) => (
                    <article className="meditation-entry" key={question.id}>
                      <div>
                        <strong>{question.title}</strong>
                        <span>{formatDateTime(question.createdAt)}</span>
                      </div>
                      <p>{question.body}</p>
                    </article>
                  ))
                ) : (
                  <p className="meditation-empty">아직 올라온 질문이 없습니다.</p>
                )}
              </div>
            </>
          ) : null}

          {activeTab === 'profile' ? (
            <>
              <div className="meditation-panel-heading">
                <div>
                  <span className="meditation-kicker">내프로필</span>
                  <h3>묵상 활동</h3>
                </div>
                <span className="meditation-complete">{syncState === 'synced' ? '동기화됨' : '로컬'}</span>
              </div>
              <div className="meditation-profile-grid">
                <div>
                  <strong>{entries.length}</strong>
                  <span>전체 기록</span>
                </div>
                <div>
                  <strong>{crossPhotos.length}</strong>
                  <span>십자가 사진</span>
                </div>
                <div>
                  <strong>{prayerRequests.length + faithQuestions.length}</strong>
                  <span>기도와 질문</span>
                </div>
              </div>
              <p className="meditation-focus">
                Luminary와 동일하게 말씀 장절은 Firebase `verse/YYYY/MMDD`에서 읽고,
                묵상 기록은 사용자별 Firebase 경로에 저장됩니다.
              </p>
            </>
          ) : null}
        </section>
      )}

    </section>
  )
}
