import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { TaskStatus } from '../types/task'

type TaskComposerProps = {
  isBusy: boolean
  onCancel: () => void
  onAddTask: (
    title: string,
    description: string,
    status: TaskStatus,
  ) => Promise<void>
}

const statusOptions: Array<{ label: string; value: TaskStatus }> = [
  { label: 'TO DO', value: 'todo' },
  { label: 'IN PROGRESS', value: 'doing' },
  { label: 'BLOCKED', value: 'blocked' },
  { label: 'DONE', value: 'done' },
]

export function TaskComposer({ isBusy, onAddTask, onCancel }: TaskComposerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
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
      await onAddTask(title, description, status)
      setTitle('')
      setDescription('')
      setStatus('todo')
      onCancel()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="task-composer sheet-form" onSubmit={handleSubmit}>
      <div className="sheet-handle" aria-hidden="true" />
      <header className="sheet-header">
        <h3>Add task</h3>
      </header>
      <div className="task-fields">
        <label className="field-label">
          <span>Title</span>
          <input
            aria-label="Task title"
            disabled={isSubmitting || isBusy}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Write a task title"
            ref={titleInputRef}
            type="text"
            value={title}
          />
        </label>
        <label className="field-label">
          <span>Details</span>
          <textarea
            aria-label="Task details"
            disabled={isSubmitting || isBusy}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add task details"
            rows={3}
            value={description}
          />
        </label>
      </div>
      <label className="field-label">
        <span>Status</span>
        <select
          aria-label="Initial status"
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
      <div className="sheet-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button disabled={isSubmitting || isBusy || !title.trim()} type="submit">
          {isSubmitting ? 'Saving' : 'Add'}
        </button>
      </div>
    </form>
  )
}
