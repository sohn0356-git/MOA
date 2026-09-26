import { useState, type FormEvent } from 'react'

type TaskComposerProps = {
  onAddTask: (content: string) => Promise<void>
}

export function TaskComposer({ onAddTask }: TaskComposerProps) {
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
        placeholder="Add a task"
        type="text"
        value={content}
      />
      <button disabled={isSubmitting || !content.trim()} type="submit">
        Add
      </button>
    </form>
  )
}
