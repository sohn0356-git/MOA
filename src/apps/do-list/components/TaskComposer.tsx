import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { TaskStatus } from '../types/task'

type TaskComposerProps = {
  isBusy: boolean
  onCancel: () => void
  onAddTask: (
    title: string,
    description: string,
    status: TaskStatus,
    dueDate: string | null,
  ) => Promise<void>
}

const statusOptions: Array<{ label: string; value: TaskStatus }> = [
  { label: '할 일', value: 'todo' },
  { label: '진행 중', value: 'doing' },
  { label: '막힘', value: 'blocked' },
  { label: '완료', value: 'done' },
]

export function TaskComposer({ isBusy, onAddTask, onCancel }: TaskComposerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [dueDate, setDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!title.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onAddTask(title, description, status, dueDate || null)
      setTitle('')
      setDescription('')
      setStatus('todo')
      setDueDate('')
      onCancel()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="task-composer sheet-form" onSubmit={handleSubmit}>
      <div className="sheet-handle" aria-hidden="true" />
      <header className="sheet-header">
        <h3>할 일 추가</h3>
      </header>
      <div className="task-fields">
        <label className="field-label">
          <span>제목</span>
          <input
            aria-label="할 일 제목"
            disabled={isSubmitting || isBusy}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="무엇을 해야 하나요?"
            ref={titleInputRef}
            type="text"
            value={title}
          />
        </label>
        <label className="field-label">
          <span>메모</span>
          <textarea
            aria-label="할 일 메모"
            disabled={isSubmitting || isBusy}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="필요한 내용을 적어두세요"
            rows={3}
            value={description}
          />
        </label>
      </div>
      <label className="field-label">
        <span>상태</span>
        <select
          aria-label="초기 상태"
          className={`status-select status-text-${status}`}
          disabled={isSubmitting || isBusy}
          onChange={(event) => setStatus(event.target.value as TaskStatus)}
          value={status}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        <span>기한</span>
        <input
          aria-label="기한"
          disabled={isSubmitting || isBusy}
          onChange={(event) => setDueDate(event.target.value)}
          type="date"
          value={dueDate}
        />
      </label>
      <div className="sheet-actions">
        <button type="button" onClick={onCancel}>
          취소
        </button>
        <button disabled={isSubmitting || isBusy || !title.trim()} type="submit">
          {isSubmitting ? '저장 중' : '추가'}
        </button>
      </div>
    </form>
  )
}
