import { useEffect, useState } from 'react'

const FOCUS_SECONDS = 25 * 60

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function TimerApp() {
  const [remainingSeconds, setRemainingSeconds] = useState(FOCUS_SECONDS)
  const [isRunning, setIsRunning] = useState(false)

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

  return (
    <section className="sub-app utility-app">
      <header className="utility-header">
        <button
          aria-label="Back to apps"
          className="nav-icon-button"
          type="button"
          onClick={handleBackHome}
        >
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M15.7 5.3a1 1 0 0 1 0 1.4L10.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.4 0Z" />
          </svg>
        </button>
        <div>
          <h2>Focus Timer</h2>
          <p>25분 집중 타이머입니다.</p>
        </div>
      </header>
      <div className="utility-panel timer-panel">
        <strong className="timer-value">{formatSeconds(remainingSeconds)}</strong>
        <div className="timer-actions">
          <button type="button" onClick={() => setIsRunning((current) => !current)}>
            {isRunning ? '일시정지' : '시작'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRunning(false)
              setRemainingSeconds(FOCUS_SECONDS)
            }}
          >
            초기화
          </button>
        </div>
      </div>
    </section>
  )
}
