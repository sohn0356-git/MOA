import {
  ArrowLeft,
  BookOpenText,
  Check,
  Heart,
  Pause,
  Play,
  RefreshCw,
  Save,
  Sparkles,
  TimerReset,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'moa.meditation.entries.v2'
const SESSION_SECONDS = 5 * 60

const dailyMeditations = [
  {
    title: '쉼',
    verse: '수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라.',
    reference: '마태복음 11:28',
    question: '오늘 내가 혼자 들고 있던 짐은 무엇인가요?',
    focus: '숨을 천천히 고르며 맡길 수 있는 것을 한 가지 적어보세요.',
  },
  {
    title: '평안',
    verse: '평안을 너희에게 끼치노니 곧 나의 평안을 너희에게 주노라.',
    reference: '요한복음 14:27',
    question: '내 마음을 가장 흔드는 생각은 무엇인가요?',
    focus: '그 생각을 내려놓는 짧은 기도를 적어보세요.',
  },
  {
    title: '감사',
    verse: '범사에 감사하라 이것이 그리스도 예수 안에서 너희를 향하신 하나님의 뜻이니라.',
    reference: '데살로니가전서 5:18',
    question: '오늘 작지만 분명했던 감사는 무엇인가요?',
    focus: '감사한 순간 세 가지를 구체적으로 적어보세요.',
  },
  {
    title: '인도',
    verse: '너는 마음을 다하여 여호와를 신뢰하고 네 명철을 의지하지 말라.',
    reference: '잠언 3:5',
    question: '내가 통제하려는 일은 무엇인가요?',
    focus: '하나님께 방향을 구하고 싶은 결정을 적어보세요.',
  },
  {
    title: '용기',
    verse: '강하고 담대하라 두려워하지 말며 놀라지 말라.',
    reference: '여호수아 1:9',
    question: '오늘 용기가 필요한 자리는 어디인가요?',
    focus: '두려움 대신 붙잡을 약속을 한 문장으로 적어보세요.',
  },
]

const moods = ['고요함', '감사함', '무거움', '기대함']

type MeditationEntry = {
  id: string
  date: string
  mood: string
  title: string
  reference: string
  text: string
}

function getTodayKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function loadEntries(): MeditationEntry[] {
  try {
    const storedEntries = window.localStorage.getItem(STORAGE_KEY)

    if (!storedEntries) {
      return []
    }

    const parsedEntries: unknown = JSON.parse(storedEntries)

    if (!Array.isArray(parsedEntries)) {
      return []
    }

    return parsedEntries.filter((entry): entry is MeditationEntry => {
      return (
        typeof entry === 'object' &&
        entry !== null &&
        'id' in entry &&
        'date' in entry &&
        'mood' in entry &&
        'title' in entry &&
        'reference' in entry &&
        'text' in entry
      )
    })
  } catch {
    return []
  }
}

function getDailyMeditation() {
  const today = new Date()
  const seed = today.getFullYear() * 372 + today.getMonth() * 31 + today.getDate()

  return dailyMeditations[seed % dailyMeditations.length]
}

export function MeditationApp() {
  const dailyMeditation = useMemo(() => getDailyMeditation(), [])
  const [entries, setEntries] = useState<MeditationEntry[]>(loadEntries)
  const [reflection, setReflection] = useState('')
  const [selectedMood, setSelectedMood] = useState(moods[0])
  const [remainingSeconds, setRemainingSeconds] = useState(SESSION_SECONDS)
  const [isRunning, setIsRunning] = useState(false)
  const trimmedReflection = reflection.trim()
  const completedToday = entries.some((entry) => entry.date.startsWith(getTodayKey()))

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

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

  function handleSave() {
    if (!trimmedReflection) {
      return
    }

    const entry: MeditationEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mood: selectedMood,
      title: dailyMeditation.title,
      reference: dailyMeditation.reference,
      text: trimmedReflection,
    }

    setEntries((currentEntries) => [entry, ...currentEntries].slice(0, 12))
    setReflection('')
  }

  function resetSession() {
    setIsRunning(false)
    setRemainingSeconds(SESSION_SECONDS)
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
          <span className="meditation-kicker">오늘의 묵상</span>
          <h2>묵상</h2>
        </div>
        <div className="meditation-streak" aria-label="Saved meditation count">
          <strong>{entries.length}</strong>
          <span>기록</span>
        </div>
      </header>

      <div className="meditation-hero">
        <div className="meditation-verse-card">
          <div className="meditation-section-label">
            <BookOpenText aria-hidden="true" />
            <span>{dailyMeditation.reference}</span>
          </div>
          <blockquote>{dailyMeditation.verse}</blockquote>
          <p>{dailyMeditation.question}</p>
        </div>

        <aside className="meditation-session-card">
          <div className="meditation-section-label">
            <Sparkles aria-hidden="true" />
            <span>{dailyMeditation.title}</span>
          </div>
          <strong>{formatSeconds(remainingSeconds)}</strong>
          <div className="meditation-session-actions">
            <button type="button" onClick={() => setIsRunning((current) => !current)}>
              {isRunning ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              <span>{isRunning ? '멈춤' : '시작'}</span>
            </button>
            <button type="button" onClick={resetSession}>
              <TimerReset aria-hidden="true" />
              <span>초기화</span>
            </button>
          </div>
        </aside>
      </div>

      <div className="meditation-workspace">
        <section className="meditation-writing-panel" aria-labelledby="meditation-writing-title">
          <div className="meditation-panel-heading">
            <div>
              <span className="meditation-kicker">기도와 생각</span>
              <h3 id="meditation-writing-title">기록하기</h3>
            </div>
            {completedToday ? (
              <span className="meditation-complete">
                <Check aria-hidden="true" />
                오늘 완료
              </span>
            ) : null}
          </div>

          <div className="meditation-mood-row" aria-label="Mood">
            {moods.map((mood) => (
              <button
                className={selectedMood === mood ? 'is-selected' : undefined}
                key={mood}
                type="button"
                onClick={() => setSelectedMood(mood)}
              >
                <Heart aria-hidden="true" />
                <span>{mood}</span>
              </button>
            ))}
          </div>

          <p className="meditation-focus">{dailyMeditation.focus}</p>

          <label className="meditation-textarea-label">
            <span>묵상 노트</span>
            <textarea
              onChange={(event) => setReflection(event.target.value)}
              placeholder="떠오른 말씀, 기도, 오늘의 결심을 남겨보세요."
              rows={9}
              value={reflection}
            />
          </label>

          <div className="meditation-writing-actions">
            <span>{trimmedReflection.length}자</span>
            <button disabled={!trimmedReflection} type="button" onClick={handleSave}>
              <Save aria-hidden="true" />
              <span>저장</span>
            </button>
          </div>
        </section>

        <section className="meditation-history-panel" aria-labelledby="meditation-history-title">
          <div className="meditation-panel-heading">
            <div>
              <span className="meditation-kicker">최근 기록</span>
              <h3 id="meditation-history-title">돌아보기</h3>
            </div>
            <button
              aria-label="Clear meditation note"
              className="meditation-icon-action"
              type="button"
              onClick={() => setReflection('')}
            >
              <RefreshCw aria-hidden="true" />
            </button>
          </div>

          {entries.length > 0 ? (
            <div className="meditation-entry-list">
              {entries.map((entry) => (
                <article className="meditation-entry" key={entry.id}>
                  <div>
                    <strong>{entry.mood}</strong>
                    <span>{formatDateTime(entry.date)}</span>
                  </div>
                  <p>{entry.text}</p>
                  <small>
                    {entry.title} · {entry.reference}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p className="meditation-empty">아직 저장된 묵상 기록이 없습니다.</p>
          )}
        </section>
      </div>
    </section>
  )
}
