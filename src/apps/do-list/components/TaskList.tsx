import { useState, type FormEvent } from 'react'
import type { Task, TaskStatus } from '../types/task'

const taskStatuses: TaskStatus[] = ['todo', 'doing', 'blocked', 'done']

const statusLabels: Record<TaskStatus, string> = {
  todo: '할 일',
  doing: '진행 중',
  blocked: '막힘',
  done: '완료',
}

type TaskListProps = {
  isBusy: boolean
  tasks: Task[]
  onDeleteTask: (taskId: string) => Promise<void>
  onEditTask: (
    taskId: string,
    title: string,
    description: string,
    dueDate: string | null,
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
  const [editDueDate, setEditDueDate] = useState('')

  if (tasks.length === 0) {
    return (
      <div className="empty-state note-empty-state">
        <span aria-hidden="true">✓</span>
        <strong>아직 할 일이 없어요</strong>
        <p>+ 버튼을 눌러 첫 할 일을 추가하세요.</p>
      </div>
    )
  }

  function openEditModal(task: Task) {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description)
    setEditDueDate(task.dueDate ?? '')
  }

  function closeEditModal() {
    setEditingTask(null)
    setEditTitle('')
    setEditDescription('')
    setEditDueDate('')
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingTask || !editTitle.trim()) {
      return
    }

    await onEditTask(editingTask.id, editTitle, editDescription, editDueDate || null)
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
          <li className={`task-item task-${task.status}`} key={task.id}>
            <button
              className="task-copy"
              type="button"
              onClick={() => openEditModal(task)}
            >
              <span className="task-title">{task.title}</span>
              {task.description ? (
                <p className="task-description">{task.description}</p>
              ) : null}
              {task.dueDate ? <span className="due-date">기한 {task.dueDate}</span> : null}
            </button>
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
            aria-label={`${statusTask.title} 상태 변경`}
            aria-modal="true"
            className="task-modal status-sheet"
            role="dialog"
          >
            <header className="modal-header">
              <h3>상태 변경</h3>
              <button
                aria-label="상태 변경 닫기"
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
            aria-label={`${editingTask.title} 수정`}
            aria-modal="true"
            className="task-modal"
            role="dialog"
          >
            <header className="modal-header">
              <h3>할 일 수정</h3>
              <button
                aria-label="수정 닫기"
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
                <span>제목</span>
                <input
                  disabled={isBusy}
                  onChange={(event) => setEditTitle(event.target.value)}
                  value={editTitle}
                />
              </label>
              <label className="field-label">
                <span>메모</span>
                <textarea
                  disabled={isBusy}
                  onChange={(event) => setEditDescription(event.target.value)}
                  rows={4}
                  value={editDescription}
                />
              </label>
              <label className="field-label">
                <span>기한</span>
                <input
                  disabled={isBusy}
                  onChange={(event) => setEditDueDate(event.target.value)}
                  type="date"
                  value={editDueDate}
                />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={closeEditModal}>
                  취소
                </button>
                <button disabled={isBusy || !editTitle.trim()} type="submit">
                  저장
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  )
}
