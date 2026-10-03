import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  Check,
  ChevronRight,
  Heart,
  HandHeart,
  Lock,
  MessageCircleHeart,
  Pause,
  Play,
  Save,
  Settings,
  Sparkles,
  Sprout,
  Trash2,
  Users,
} from 'lucide-react'
import { FirebaseError } from 'firebase/app'
import { get, onValue, push, ref, remove, serverTimestamp, set } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'
import { getFirebaseAuth, getRealtimeDb } from '../../services/firebase'

const LOCAL_STORAGE_KEY = 'moa.meditation.entries.v3'
const SESSION_SECONDS = 5 * 60

type Audience = 'private' | 'public' | 'group'
type LuminaryTab = 'feed' | 'groups' | 'devotion' | 'prayer' | 'profile'
type MeditationStep = 'read' | 'write' | 'review'

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

const moods = ['고요함', '감사함', '무거움', '기대함', '회복']

const luminaryTabs: Array<{
  icon: typeof MessageCircleHeart
  id: LuminaryTab
  label: string
}> = [
  { icon: MessageCircleHeart, id: 'feed', label: '커뮤니티' },
  { icon: Sprout, id: 'groups', label: '그룹' },
  { icon: BookOpenText, id: 'devotion', label: '묵상' },
  { icon: HandHeart, id: 'prayer', label: '중보기도' },
  { icon: Settings, id: 'profile', label: '내프로필' },
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

function getTodayKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function createLocalId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
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
    return exactPlan
  }

  const seed = date.split('-').join('')
  const index = Number(seed) % scripturePlans.length

  return scripturePlans[index]
}

function buildReference(book: string, chapter: number, start: number, end: number) {
  const range = start === end ? String(start) : `${start}-${end}`

  return `${book} ${chapter}:${range}`
}

function createVerseShell(start: number, end: number, reference: string): Verse[] {
  const verses: Verse[] = []

  for (let verseNumber = start; verseNumber <= end; verseNumber += 1) {
    verses.push({
      number: verseNumber,
      text: `${reference} 본문입니다. Firebase에서 오늘의 장절을 불러왔습니다.`,
    })
  }

  return verses
}

function planFromFirebaseRange(date: string, range: FirebaseVerseRange): ScripturePlan | null {
  const [bookValue, chapterValue, startValue, endValue] = range
  const book = typeof bookValue === 'string' ? bookValue : ''
  const chapter = Number(chapterValue)
  const start = Number(startValue)
  const end = Number(endValue ?? startValue)

  if (!book || !Number.isFinite(chapter) || !Number.isFinite(start) || !Number.isFinite(end)) {
    return null
  }

  const reference = buildReference(book, chapter, start, end)

  return {
    date,
    isRemote: true,
    title: '오늘의 본문',
    reference,
    theme: 'Firebase 말씀',
    question: '오늘 이 본문에서 붙잡아야 할 한 문장은 무엇인가요?',
    verses: knownPassageText[reference] ?? createVerseShell(start, end, reference),
  }
}

async function fetchFirebasePlan(date: string) {
  const [year, month, day] = date.split('-')
  const dayKey = `${month}${day}`
  const snapshot = await get(ref(getRealtimeDb(), `verse/${year}/${dayKey}`))
  const value = snapshot.val() as FirebaseVerseRange[] | null

  if (!Array.isArray(value) || !value.length) {
    return null
  }

  return planFromFirebaseRange(date, value[0])
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

export function MeditationApp() {
  const [activeTab, setActiveTab] = useState<LuminaryTab>('devotion')
  const [selectedDate, setSelectedDate] = useState(getTodayKey)
  const [selectedVerseNumbers, setSelectedVerseNumbers] = useState<number[]>([])
  const [remotePlan, setRemotePlan] = useState<ScripturePlan | null>(null)
  const [isPlanLoading, setIsPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [step, setStep] = useState<MeditationStep>('read')
  const [mind, setMind] = useState('')
  const [apply, setApply] = useState('')
  const [mood, setMood] = useState(moods[0])
  const [audience, setAudience] = useState<Audience>('private')
  const [entries, setEntries] = useState<MeditationEntry[]>(loadLocalEntries)
  const [remainingSeconds, setRemainingSeconds] = useState(SESSION_SECONDS)
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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

  useEffect(() => {
    setSelectedVerseNumbers([])
    setStep('read')
    setRemotePlan(null)
    setPlanError('')
  }, [selectedDate])

  useEffect(() => {
    let active = true

    setIsPlanLoading(true)
    setPlanError('')
    void fetchFirebasePlan(selectedDate)
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
  }, [selectedDate])

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
    if (syncState !== 'synced') {
      saveLocalEntries(entries)
    }
  }, [entries, syncState])

  useEffect(() => {
    if (!isRunning) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        if (currentSeconds <= 1) {
          setIsRunning(false)
          return 0
        }

        return currentSeconds - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isRunning])

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

  function resetTimer() {
    setIsRunning(false)
    setRemainingSeconds(SESSION_SECONDS)
  }

  async function handleSave() {
    if (!canSave || isSaving) {
      return
    }

    const entry: MeditationEntry = {
      id: createLocalId(),
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

    try {
      if (currentUser) {
        const entryRef = push(ref(getRealtimeDb(), getUserEntriesPath(currentUser.uid)))
        await set(entryRef, {
          apply: entry.apply,
          audience: entry.audience,
          mind: entry.mind,
          mood: entry.mood,
          reference: entry.reference,
          selectedDate: entry.selectedDate,
          selectedVerseNumbers: entry.selectedVerseNumbers,
          theme: entry.theme,
          verseText: entry.verseText,
          createdAt: entry.createdAt,
          createdAtMs: serverTimestamp(),
        })
      } else {
        setEntries((currentEntries) => [entry, ...currentEntries].slice(0, 30))
      }

      setMind('')
      setApply('')
      setStep('review')
    } catch (error) {
      setEntries((currentEntries) => [entry, ...currentEntries].slice(0, 30))
      setSyncState('error')
      setErrorMessage(
        error instanceof FirebaseError
          ? error.message
          : 'Firebase 저장에 실패해 이 브라우저에 임시 저장했습니다.',
      )
      setStep('review')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(entry: MeditationEntry) {
    if (!window.confirm('이 묵상 기록을 삭제할까요?')) {
      return
    }

    if (currentUser && syncState === 'synced') {
      await remove(ref(getRealtimeDb(), `${getUserEntriesPath(currentUser.uid)}/${entry.id}`))
      return
    }

    setEntries((currentEntries) => currentEntries.filter((currentEntry) => currentEntry.id !== entry.id))
  }

  return (
    <section className="sub-app meditation-screen">
      <header className="meditation-header">
        <button
          aria-label="Back to apps"
          className="nav-icon-button"
          type="button"
          onClick={handleBackHome}
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <div>
          <span className="meditation-kicker">Luminary flow</span>
          <h2>묵상</h2>
        </div>
        <div className="meditation-streak" aria-label="Meditation activity">
          <strong>{activeDays}</strong>
          <span>활동일</span>
        </div>
      </header>

      {activeTab === 'devotion' ? (
        <>
      <div className="meditation-topbar">
        <label>
          <CalendarDays aria-hidden="true" />
          <span>날짜</span>
          <input
            max="2099-12-31"
            min="2020-01-01"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
        <span className={`meditation-sync meditation-sync-${syncState}`}>
          {syncState === 'synced'
            ? 'Firebase 동기화됨'
            : syncState === 'syncing'
              ? '동기화 중'
              : syncState === 'error'
                ? '로컬 보관 중'
                : '로컬 모드'}
        </span>
      </div>

      {planError ? <p className="meditation-error">{planError}</p> : null}

      <div className="meditation-hero meditation-luminary-hero">
        <div className="meditation-verse-card">
          <div className="meditation-section-label">
            <BookOpenText aria-hidden="true" />
            <span>
              {plan.reference}
              {plan.isRemote ? ' · Firebase' : ' · fallback'}
            </span>
          </div>
          <h3>{plan.title}</h3>
          <blockquote>
            {isPlanLoading ? 'Firebase에서 오늘의 본문을 불러오는 중입니다.' : selectedVerseText}
          </blockquote>
          <p>{plan.question}</p>
          <div className="meditation-step-row" aria-label="Meditation steps">
            {(['read', 'write', 'review'] as MeditationStep[]).map((itemStep, index) => (
              <button
                className={step === itemStep ? 'is-selected' : undefined}
                key={itemStep}
                type="button"
                onClick={() => setStep(itemStep)}
              >
                <span>{index + 1}</span>
                {itemStep === 'read' ? '읽기' : itemStep === 'write' ? '기록' : '돌아보기'}
              </button>
            ))}
          </div>
        </div>

        <aside className="meditation-session-card">
          <div className="meditation-section-label">
            <Sparkles aria-hidden="true" />
            <span>{plan.theme}</span>
          </div>
          <strong>{formatSeconds(remainingSeconds)}</strong>
          <div className="meditation-session-actions">
            <button type="button" onClick={() => setIsRunning((current) => !current)}>
              {isRunning ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              <span>{isRunning ? '멈춤' : '시작'}</span>
            </button>
            <button type="button" onClick={resetTimer}>
              <span>초기화</span>
            </button>
          </div>
        </aside>
      </div>

      {errorMessage ? <p className="meditation-error">{errorMessage}</p> : null}

      {step === 'read' ? (
        <section className="meditation-reading-panel" aria-labelledby="meditation-read-title">
          <div className="meditation-panel-heading">
            <div>
              <span className="meditation-kicker">본문 읽기</span>
              <h3 id="meditation-read-title">마음에 남는 절을 선택하세요</h3>
            </div>
            {selectedVerseNumbers.length ? (
              <span className="meditation-complete">
                <Check aria-hidden="true" />
                {selectedVerseNumbers.length}절 선택
              </span>
            ) : null}
          </div>
          <div className="meditation-verse-list">
            {plan.verses.map((verse) => (
              <button
                className={selectedVerseNumbers.includes(verse.number) ? 'is-selected' : undefined}
                key={verse.number}
                type="button"
                onClick={() => toggleVerse(verse.number)}
              >
                <sup>{verse.number}</sup>
                <span>{verse.text}</span>
              </button>
            ))}
          </div>
          <button className="meditation-next-button" type="button" onClick={() => setStep('write')}>
            묵상 기록하기
            <ChevronRight aria-hidden="true" />
          </button>
        </section>
      ) : null}

      {step === 'write' ? (
        <div className="meditation-workspace">
          <section className="meditation-writing-panel" aria-labelledby="meditation-writing-title">
            <div className="meditation-panel-heading">
              <div>
                <span className="meditation-kicker">묵상과 적용</span>
                <h3 id="meditation-writing-title">기록하기</h3>
              </div>
              {completedToday ? (
                <span className="meditation-complete">
                  <Check aria-hidden="true" />
                  오늘 기록 있음
                </span>
              ) : null}
            </div>

            <div className="meditation-mood-row" aria-label="Mood">
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
              <span>묵상</span>
              <textarea
                onChange={(event) => setMind(event.target.value)}
                placeholder="말씀을 통해 발견한 하나님, 나의 마음, 떠오른 기도를 적어보세요."
                rows={7}
                value={mind}
              />
            </label>

            <label className="meditation-textarea-label">
              <span>적용</span>
              <textarea
                onChange={(event) => setApply(event.target.value)}
                placeholder="오늘 실천할 한 가지를 구체적으로 적어보세요."
                rows={5}
                value={apply}
              />
            </label>

            <div className="meditation-audience-row" aria-label="Audience">
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
              <button disabled={!canSave || isSaving} type="button" onClick={() => void handleSave()}>
                <Save aria-hidden="true" />
                <span>{isSaving ? '저장 중' : '저장'}</span>
              </button>
            </div>
          </section>

          <aside className="meditation-history-panel">
            <span className="meditation-kicker">선택한 본문</span>
            <p className="meditation-focus">{selectedVerseText}</p>
          </aside>
        </div>
      ) : null}

      {step === 'review' ? (
        <section className="meditation-history-panel meditation-review-panel" aria-labelledby="meditation-history-title">
          <div className="meditation-panel-heading">
            <div>
              <span className="meditation-kicker">최근 기록</span>
              <h3 id="meditation-history-title">돌아보기</h3>
            </div>
            <span className="meditation-complete">{entries.length}개 기록</span>
          </div>

          {entries.length > 0 ? (
            <div className="meditation-entry-list">
              {entries.map((entry) => (
                <article className="meditation-entry" key={entry.id}>
                  <div>
                    <strong>{entry.mood}</strong>
                    <span>{formatDateTime(entry.createdAt)}</span>
                  </div>
                  <small>
                    {entry.reference} · {entry.theme} ·{' '}
                    {entry.audience === 'private'
                      ? '나만 보기'
                      : entry.audience === 'group'
                        ? '그룹 공개'
                        : '전체 공개'}
                  </small>
                  <blockquote>{entry.verseText}</blockquote>
                  {entry.mind ? <p>{entry.mind}</p> : null}
                  {entry.apply ? <p className="meditation-entry-apply">적용 · {entry.apply}</p> : null}
                  <button
                    aria-label="Delete meditation entry"
                    className="meditation-delete-button"
                    type="button"
                    onClick={() => void handleDelete(entry)}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="meditation-empty">아직 저장된 묵상 기록이 없습니다.</p>
          )}
        </section>
      ) : null}
        </>
      ) : (
        <section className="meditation-tab-panel">
          {activeTab === 'feed' ? (
            <>
              <div className="meditation-panel-heading">
                <div>
                  <span className="meditation-kicker">커뮤니티</span>
                  <h3>공개 묵상 피드</h3>
                </div>
                <span className="meditation-complete">
                  {entries.filter((entry) => entry.audience === 'public').length}개
                </span>
              </div>
              <div className="meditation-entry-list">
                {entries.filter((entry) => entry.audience === 'public').length ? (
                  entries
                    .filter((entry) => entry.audience === 'public')
                    .map((entry) => (
                      <article className="meditation-entry" key={entry.id}>
                        <div>
                          <strong>{entry.mood}</strong>
                          <span>{formatDateTime(entry.createdAt)}</span>
                        </div>
                        <small>{entry.reference} · {entry.theme}</small>
                        <blockquote>{entry.verseText}</blockquote>
                        <p>{entry.mind || entry.apply}</p>
                      </article>
                    ))
                ) : (
                  <p className="meditation-empty">전체 공개로 저장된 묵상이 없습니다.</p>
                )}
              </div>
            </>
          ) : null}

          {activeTab === 'groups' ? (
            <>
              <div className="meditation-panel-heading">
                <div>
                  <span className="meditation-kicker">그룹</span>
                  <h3>그룹 공개 묵상</h3>
                </div>
                <span className="meditation-complete">
                  {entries.filter((entry) => entry.audience === 'group').length}개
                </span>
              </div>
              <div className="meditation-group-card">
                <Users aria-hidden="true" />
                <div>
                  <strong>MOA 묵상 그룹</strong>
                  <p>그룹 공개로 저장한 묵상을 한 곳에서 모아봅니다.</p>
                </div>
              </div>
              <div className="meditation-entry-list">
                {entries.filter((entry) => entry.audience === 'group').length ? (
                  entries
                    .filter((entry) => entry.audience === 'group')
                    .map((entry) => (
                      <article className="meditation-entry" key={entry.id}>
                        <div>
                          <strong>{entry.mood}</strong>
                          <span>{formatDateTime(entry.createdAt)}</span>
                        </div>
                        <small>{entry.reference} · 그룹 공개</small>
                        <p>{entry.mind || entry.apply}</p>
                      </article>
                    ))
                ) : (
                  <p className="meditation-empty">그룹 공개로 저장된 묵상이 없습니다.</p>
                )}
              </div>
            </>
          ) : null}

          {activeTab === 'prayer' ? (
            <>
              <div className="meditation-panel-heading">
                <div>
                  <span className="meditation-kicker">중보기도</span>
                  <h3>묵상에서 이어지는 기도</h3>
                </div>
                <span className="meditation-complete">{entries.length}개 기록</span>
              </div>
              <div className="meditation-entry-list">
                {entries.length ? (
                  entries.slice(0, 8).map((entry) => (
                    <article className="meditation-entry" key={entry.id}>
                      <div>
                        <strong>{entry.reference}</strong>
                        <span>{formatDateTime(entry.createdAt)}</span>
                      </div>
                      <p>{entry.apply || entry.mind || '오늘의 적용을 기도로 이어가세요.'}</p>
                    </article>
                  ))
                ) : (
                  <p className="meditation-empty">기도로 이어갈 묵상 기록이 없습니다.</p>
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
                  <strong>{activeDays}</strong>
                  <span>활동일</span>
                </div>
                <div>
                  <strong>{entries.filter((entry) => entry.selectedDate === getTodayKey()).length}</strong>
                  <span>오늘 기록</span>
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

      <nav className="meditation-bottom-tabs" aria-label="Luminary tabs">
        {luminaryTabs.map((tab) => {
          const Icon = tab.icon

          return (
            <button
              className={activeTab === tab.id ? 'is-selected' : undefined}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </section>
  )
}
