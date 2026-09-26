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
          <span className="task-content">{task.content}</span>
          <div className="task-controls">
            <div className="status-buttons" aria-label={`Status for ${task.content}`}>
              {taskStatuses.map((status) => (
                <button
                  className={`status-pill status-${status}`}
                  disabled={isBusy || task.status === status}
                  key={status}
                  type="button"
                  onClick={() => void onUpdateStatus(task.id, status)}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
            <button
              disabled={isBusy}
              type="button"
              onClick={() => void onDeleteTask(task.id)}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
