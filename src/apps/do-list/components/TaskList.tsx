import type { Task, TaskStatus } from '../types/task'

const taskStatuses: TaskStatus[] = ['todo', 'doing', 'blocked', 'done']

type TaskListProps = {
  tasks: Task[]
  onDeleteTask: (taskId: string) => Promise<void>
  onUpdateStatus: (taskId: string, status: TaskStatus) => Promise<void>
}

export function TaskList({ tasks, onDeleteTask, onUpdateStatus }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="empty-state">Your tasks will appear here.</p>
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <li className="task-item" key={task.id}>
          <span className="task-content">{task.content}</span>
          <div className="task-controls">
            <select
              aria-label={`Status for ${task.content}`}
              onChange={(event) =>
                void onUpdateStatus(task.id, event.target.value as TaskStatus)
              }
              value={task.status}
            >
              {taskStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void onDeleteTask(task.id)}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
