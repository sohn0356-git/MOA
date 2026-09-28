import { useMemo, useState } from 'react'
import { signOut } from 'firebase/auth'
import { TaskComposer } from './components/TaskComposer'
import { TaskList } from './components/TaskList'
import { getFirebaseAuth } from '../../services/firebase'
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
  const auth = getFirebaseAuth()
  const userId = auth.currentUser?.uid ?? null
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('active')
  const [categoryName, setCategoryName] = useState('')
  const [isAddingTask, setIsAddingTask] = useState(false)
  const {
    categories,
    tasks,
    isLoading,
    isMutating,
    error,
    addCategory,
    addTask,
    editTask,
    moveCategory,
    renameCategory,
    removeCategory,
    removeTask,
    setTaskStatus,
  } = useTasks(userId)
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

  async function handleAddCategory() {
    if (!categoryName.trim()) {
      return
    }

    await addCategory(categoryName)
    setCategoryName('')
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
        <button
          aria-label="로그아웃"
          className="nav-icon-button"
          disabled={isMutating}
          type="button"
          onClick={() => void signOut(auth)}
        >
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M16 17v-2h-5a1 1 0 1 1 0-2h5v-2l3 3-3 3ZM4 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3a1 1 0 1 1-2 0V4H6v16h6v-3a1 1 0 1 1 2 0v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Z" />
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

      <section className="category-manager" aria-label="카테고리 관리">
        <div className="category-manager-copy">
          <strong>카테고리</strong>
          <span>{categories.length}개</span>
        </div>
        <div className="category-input-row">
          <input
            aria-label="새 카테고리 이름"
            onChange={(event) => setCategoryName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleAddCategory()
              }
            }}
            placeholder="카테고리 추가"
            value={categoryName}
          />
          <button
            disabled={isMutating || !categoryName.trim()}
            type="button"
            onClick={() => void handleAddCategory()}
          >
            <svg viewBox="0 0 24 24" role="presentation" focusable="false">
              <path d="M11 5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5Z" />
            </svg>
            <span>추가</span>
          </button>
        </div>
      </section>

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
            categories={categories}
            isBusy={isMutating}
            onAddCategory={addCategory}
            onDeleteTask={removeTask}
            onEditTask={editTask}
            onMoveCategory={moveCategory}
            onRenameCategory={renameCategory}
            onRemoveCategory={removeCategory}
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
                categories={categories}
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
