import { useState } from 'react'

const meditationPrompts = [
  '오늘 붙잡을 말씀이나 문장을 적어보세요.',
  '감사한 일 세 가지를 조용히 기록해보세요.',
  '오늘 내려놓고 싶은 걱정을 한 문장으로 적어보세요.',
]

export function MeditationApp() {
  const [selectedPrompt, setSelectedPrompt] = useState(meditationPrompts[0])
  const [reflection, setReflection] = useState('')

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
          <h2>묵상</h2>
          <p>짧게 읽고, 조용히 기록하세요.</p>
        </div>
      </header>
      <div className="utility-panel">
        <label className="field-label">
          <span>오늘의 질문</span>
          <select
            onChange={(event) => setSelectedPrompt(event.target.value)}
            value={selectedPrompt}
          >
            {meditationPrompts.map((prompt) => (
              <option key={prompt} value={prompt}>
                {prompt}
              </option>
            ))}
          </select>
        </label>
        <p className="utility-callout">{selectedPrompt}</p>
        <label className="field-label">
          <span>묵상 기록</span>
          <textarea
            onChange={(event) => setReflection(event.target.value)}
            placeholder="떠오른 생각을 적어두세요."
            rows={8}
            value={reflection}
          />
        </label>
        <span className="utility-counter">{reflection.trim().length}자</span>
      </div>
    </section>
  )
}
