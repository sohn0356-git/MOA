import { useState } from 'react'

const defaultHabits = ['물 마시기', '운동', '독서']

export function HabitApp() {
  const [checkedHabits, setCheckedHabits] = useState<string[]>([])

  function handleBackHome() {
    history.pushState('', document.title, window.location.pathname + window.location.search)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }

  function toggleHabit(habit: string) {
    setCheckedHabits((currentHabits) => {
      if (currentHabits.includes(habit)) {
        return currentHabits.filter((currentHabit) => currentHabit !== habit)
      }

      return [...currentHabits, habit]
    })
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
          <h2>Habit</h2>
          <p>오늘의 기본 루틴을 체크합니다.</p>
        </div>
      </header>
      <div className="utility-panel">
        <strong className="utility-score">
          {checkedHabits.length}/{defaultHabits.length}
        </strong>
        <div className="habit-list">
          {defaultHabits.map((habit) => (
            <label className="habit-row" key={habit}>
              <input
                checked={checkedHabits.includes(habit)}
                onChange={() => toggleHabit(habit)}
                type="checkbox"
              />
              <span>{habit}</span>
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}
