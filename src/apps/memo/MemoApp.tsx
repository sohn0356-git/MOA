import { useState } from 'react'

export function MemoApp() {
  const [memo, setMemo] = useState('')

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
          <h2>Memo</h2>
          <p>빠르게 적어두는 임시 메모장입니다.</p>
        </div>
      </header>
      <div className="utility-panel">
        <label className="field-label">
          <span>메모</span>
          <textarea
            onChange={(event) => setMemo(event.target.value)}
            placeholder="생각, 링크, 아이디어를 바로 적으세요."
            rows={12}
            value={memo}
          />
        </label>
        <span className="utility-counter">{memo.trim().length}자</span>
      </div>
    </section>
  )
}
