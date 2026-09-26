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
  onUpdateStatus: (taskId: string, status: TaskStatus) => Promise<void>
}

export function TaskList({
  isBusy,
  tasks,
  onDeleteTask,
  onUpdateStatus,
}: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="empty-state">Your tasks will appear here.</p>
  }

  return (
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
            <select
              aria-label={`Status for ${task.title}`}
              className={`status-select status-text-${task.status}`}
              disabled={isBusy}
              onChange={(event) =>
                void onUpdateStatus(task.id, event.target.value as TaskStatus)
              }
              value={task.status}
            >
              {taskStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
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
        </li>
      ))}
    </ul>
  )
}
