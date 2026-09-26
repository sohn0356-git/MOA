import { useState, type FormEvent } from 'react'

type TaskComposerProps = {
  isBusy: boolean
  onAddTask: (content: string) => Promise<void>
}

export function TaskComposer({ isBusy, onAddTask }: TaskComposerProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!content.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onAddTask(content)
      setContent('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="task-composer" onSubmit={handleSubmit}>
      <input
        aria-label="Task content"
        onChange={(event) => setContent(event.target.value)}
        disabled={isSubmitting || isBusy}
        placeholder="Add a task"
        type="text"
        value={content}
      />
      <button disabled={isSubmitting || isBusy || !content.trim()} type="submit">
        {isSubmitting ? 'Saving' : 'Add'}
      </button>
    </form>
  )
}
