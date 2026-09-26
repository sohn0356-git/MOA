import { useMemo, useState } from 'react'
import { TaskComposer } from './components/TaskComposer'
import { TaskList } from './components/TaskList'
import { useTasks } from './hooks/useTasks'
import type { TaskStatus } from './types/task'

type TaskFilter = 'active' | TaskStatus

const filterItems: Array<{ label: string; value: TaskFilter }> = [
  { label: '미완료', value: 'active' },
  { label: '할 일', value: 'todo' },
  { label: '진행 중', value: 'doing' },
  { label: '막힘', value: 'blocked' },
  { label: '완료', value: 'done' },
]

export function DoListApp() {
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('active')
  const [isAddingTask, setIsAddingTask] = useState(false)
  const {
    tasks,
    isLoading,
    isMutating,
    error,
    addTask,
    editTask,
    removeTask,
    setTaskStatus,
  } = useTasks()
  const taskCounts = useMemo(() => {
    return tasks.reduce(
      (counts, task) => {
        if (task.status !== 'done') {
          counts.active += 1
        }
        counts[task.status] += 1
        return counts
      },
      { active: 0, blocked: 0, doing: 0, done: 0, todo: 0 },
    )
  }, [tasks])
  const visibleTasks = useMemo(() => {
    if (activeFilter === 'active') {
      return tasks.filter((task) => task.status !== 'done')
    }

    return tasks.filter((task) => task.status === activeFilter)
  }, [activeFilter, tasks])
  const activeCount = taskCounts.todo + taskCounts.doing + taskCounts.blocked

  function handleBackHome() {
    history.pushState('', document.title, window.location.pathname + window.location.search)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }

  return (
    <section className="sub-app do-list-screen">
      <header className="do-list-header">
        <button
          aria-label="Back to apps"
          className="nav-icon-button"
          type="button"
          onClick={handleBackHome}
        >
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M15.7 5.3a1 1 0 0 1 0 1.4L10.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.4 0Z" />
          </svg>
        </button>
        <button aria-label="Do List menu" className="nav-icon-button" type="button">
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M6 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
          </svg>
        </button>
      </header>

      <div className="do-list-title-block">
        <div>
          <h2>Do List</h2>
          <p>
            활성 {activeCount} · 완료 {taskCounts.done}
          </p>
        </div>
      </div>

      <nav className="task-filter-bar" aria-label="Task filters">
        {filterItems.map((filter) => (
          <button
            className={filter.value === activeFilter ? 'filter-chip active' : 'filter-chip'}
            key={filter.value}
            type="button"
            onClick={() => setActiveFilter(filter.value)}
          >
            <span>{filter.label}</span>
            <small>{taskCounts[filter.value]}</small>
          </button>
        ))}
      </nav>

      {error ? <p className="app-error">{error}</p> : null}
      {isLoading ? (
        <div className="task-skeleton-list" aria-label="할 일 불러오는 중">
          <div />
          <div />
          <div />
        </div>
      ) : null}

      {!isLoading && !error ? (
        <>
          <TaskList
            isBusy={isMutating}
            onDeleteTask={removeTask}
            onEditTask={editTask}
            onUpdateStatus={setTaskStatus}
            tasks={visibleTasks}
          />
          <button
            aria-label="Add task"
            className="fab-button"
            type="button"
            onClick={() => setIsAddingTask(true)}
          >
            <svg viewBox="0 0 24 24" role="presentation" focusable="false">
              <path d="M11 5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5Z" />
            </svg>
          </button>
          {isAddingTask ? (
            <div className="sheet-backdrop" role="presentation">
              <TaskComposer
                isBusy={isMutating}
                onAddTask={addTask}
                onCancel={() => setIsAddingTask(false)}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
