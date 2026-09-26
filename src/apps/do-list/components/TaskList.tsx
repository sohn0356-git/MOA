import { useState, type FormEvent } from 'react'
import type { Task, TaskStatus } from '../types/task'

const taskStatuses: TaskStatus[] = ['todo', 'doing', 'blocked', 'done']

const statusLabels: Record<TaskStatus, string> = {
  todo: 'TO DO',
  doing: 'IN PROGRESS',
  blocked: 'BLOCKED',
  done: 'DONE',
}

type TaskListProps = {
  isBusy: boolean
  tasks: Task[]
  onDeleteTask: (taskId: string) => Promise<void>
  onEditTask: (
    taskId: string,
    title: string,
    description: string,
  ) => Promise<void>
  onUpdateStatus: (taskId: string, status: TaskStatus) => Promise<void>
}

export function TaskList({
  isBusy,
  tasks,
  onDeleteTask,
  onEditTask,
  onUpdateStatus,
}: TaskListProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [statusTask, setStatusTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  if (tasks.length === 0) {
    return <p className="empty-state">Your tasks will appear here.</p>
  }

  function openEditModal(task: Task) {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description)
  }

  function closeEditModal() {
    setEditingTask(null)
    setEditTitle('')
    setEditDescription('')
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingTask || !editTitle.trim()) {
      return
    }

    await onEditTask(editingTask.id, editTitle, editDescription)
    closeEditModal()
  }

  async function handleStatusChange(status: TaskStatus) {
    if (!statusTask) {
      return
    }

    await onUpdateStatus(statusTask.id, status)
    setStatusTask(null)
  }

  return (
    <>
      <ul className="task-list">
        {tasks.map((task) => (
          <li className="task-item" key={task.id}>
            <div className="task-copy">
              <span className="task-title">{task.title}</span>
              {task.description ? (
                <p className="task-description">{task.description}</p>
              ) : null}
            </div>
            <div className="task-controls">
              <button
                className={`status-chip status-text-${task.status}`}
                disabled={isBusy}
                type="button"
                onClick={() => setStatusTask(task)}
              >
                {statusLabels[task.status]}
              </button>
              <div className="task-actions">
                <button
                  aria-label={`Edit ${task.title}`}
                  className="icon-button"
                  disabled={isBusy}
                  type="button"
                  onClick={() => openEditModal(task)}
                >
                  <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                    <path d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25ZM19.71 7.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.06 1.06 2.75 2.75 1.06-1.06Z" />
                  </svg>
                </button>
                <button
                  aria-label={`Delete ${task.title}`}
                  className="icon-button delete-button"
                  disabled={isBusy}
                  type="button"
                  onClick={() => void onDeleteTask(task.id)}
                >
                  <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                    <path d="M9 3h6a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2h-1v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4a1 1 0 0 1 0-2h4V4a1 1 0 0 1 1-1Zm2 2h2V5h-2Zm-4 2v13h10V7H7Zm3 3a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1Z" />
                  </svg>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {statusTask ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-label={`Change status for ${statusTask.title}`}
            aria-modal="true"
            className="task-modal"
            role="dialog"
          >
            <header className="modal-header">
              <h3>Change status</h3>
              <button
                aria-label="Close status dialog"
                className="icon-button"
                type="button"
                onClick={() => setStatusTask(null)}
              >
                <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                  <path d="M6.3 5.3a1 1 0 0 1 1.4 0L12 9.6l4.3-4.3a1 1 0 1 1 1.4 1.4L13.4 11l4.3 4.3a1 1 0 0 1-1.4 1.4L12 12.4l-4.3 4.3a1 1 0 0 1-1.4-1.4l4.3-4.3-4.3-4.3a1 1 0 0 1 0-1.4Z" />
                </svg>
              </button>
            </header>
            <div className="status-modal-list">
              {taskStatuses.map((status) => (
                <button
                  className={`status-option status-text-${status}`}
                  disabled={isBusy || statusTask.status === status}
                  key={status}
                  type="button"
                  onClick={() => void handleStatusChange(status)}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {editingTask ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-label={`Edit ${editingTask.title}`}
            aria-modal="true"
            className="task-modal"
            role="dialog"
          >
            <header className="modal-header">
              <h3>Edit task</h3>
              <button
                aria-label="Close edit dialog"
                className="icon-button"
                type="button"
                onClick={closeEditModal}
              >
                <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                  <path d="M6.3 5.3a1 1 0 0 1 1.4 0L12 9.6l4.3-4.3a1 1 0 1 1 1.4 1.4L13.4 11l4.3 4.3a1 1 0 0 1-1.4 1.4L12 12.4l-4.3 4.3a1 1 0 0 1-1.4-1.4l4.3-4.3-4.3-4.3a1 1 0 0 1 0-1.4Z" />
                </svg>
              </button>
            </header>
            <form className="edit-form" onSubmit={(event) => void handleEditSubmit(event)}>
              <label className="field-label">
                <span>Title</span>
                <input
                  disabled={isBusy}
                  onChange={(event) => setEditTitle(event.target.value)}
                  value={editTitle}
                />
              </label>
              <label className="field-label">
                <span>Details</span>
                <textarea
                  disabled={isBusy}
                  onChange={(event) => setEditDescription(event.target.value)}
                  rows={4}
                  value={editDescription}
                />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={closeEditModal}>
                  Cancel
                </button>
                <button disabled={isBusy || !editTitle.trim()} type="submit">
                  Save
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  )
}
