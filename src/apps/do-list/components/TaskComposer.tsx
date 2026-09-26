import { useState, type FormEvent } from 'react'
import type { TaskStatus } from '../types/task'

type TaskComposerProps = {
  isBusy: boolean
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

export function TaskComposer({ isBusy, onAddTask }: TaskComposerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="task-composer" onSubmit={handleSubmit}>
      <div className="task-fields">
        <input
          aria-label="Task title"
          disabled={isSubmitting || isBusy}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          type="text"
          value={title}
        />
        <textarea
          aria-label="Task details"
          disabled={isSubmitting || isBusy}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Details"
          rows={3}
          value={description}
        />
      </div>
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
      <button disabled={isSubmitting || isBusy || !title.trim()} type="submit">
        {isSubmitting ? 'Saving' : 'Add'}
      </button>
    </form>
  )
}
