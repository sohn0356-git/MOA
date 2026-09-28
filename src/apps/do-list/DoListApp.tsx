import { useMemo, useState, type FormEvent } from 'react'
import { signOut } from 'firebase/auth'
import { TaskComposer } from './components/TaskComposer'
import { TaskList } from './components/TaskList'
import { getFirebaseAuth } from '../../services/firebase'
import { useTasks } from './hooks/useTasks'
import type { Task, TaskCategory, TaskStatus } from './types/task'

type TaskFilter = 'active' | TaskStatus

const filterItems: Array<{ label: string; value: TaskFilter }> = [
  { label: '미완료', value: 'active' },
  { label: '할 일', value: 'todo' },
  { label: '진행 중', value: 'doing' },
  { label: '막힘', value: 'blocked' },
  { label: '완료', value: 'done' },
]

type CategoryManagerSheetProps = {
  categories: TaskCategory[]
  isBusy: boolean
  tasks: Task[]
  onAddCategory: (name: string, parentId?: string | null) => Promise<void>
  onClose: () => void
  onMoveCategory: (categoryId: string, direction: -1 | 1) => Promise<void>
  onRenameCategory: (categoryId: string, name: string) => Promise<void>
  onRemoveCategory: (categoryId: string) => Promise<void>
}

function getChildCategories(categories: TaskCategory[], parentId: string | null) {
  return categories.filter((category) => category.parentId === parentId)
}

function getCategoryTaskCount(tasks: Task[], categoryId: string) {
  return tasks.filter((task) => task.categoryId === categoryId).length
}

function CategoryManagerSheet({
  categories,
  isBusy,
  tasks,
  onAddCategory,
  onClose,
  onMoveCategory,
  onRenameCategory,
  onRemoveCategory,
}: CategoryManagerSheetProps) {
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [subcategoryNames, setSubcategoryNames] = useState<Record<string, string>>({})
  const topCategories = getChildCategories(categories, null)

  async function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!newCategoryName.trim()) {
      return
    }

    await onAddCategory(newCategoryName)
    setNewCategoryName('')
  }

  function startCategoryEdit(category: TaskCategory) {
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.name)
  }

  async function handleCategoryEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingCategoryId || !editingCategoryName.trim()) {
      return
    }

    await onRenameCategory(editingCategoryId, editingCategoryName)
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  async function handleAddSubcategory(event: FormEvent<HTMLFormElement>, parentId: string) {
    event.preventDefault()

    const nextName = subcategoryNames[parentId]?.trim()

    if (!nextName) {
      return
    }

    await onAddCategory(nextName, parentId)
    setSubcategoryNames((currentNames) => ({ ...currentNames, [parentId]: '' }))
  }

  function renderCategoryRow(category: TaskCategory, level: 0 | 1) {
    const siblings = getChildCategories(categories, category.parentId)
    const categoryIndex = siblings.findIndex((sibling) => sibling.id === category.id)
    const taskCount = getCategoryTaskCount(tasks, category.id)
    const isEditing = editingCategoryId === category.id

    return (
      <div className={`category-admin-row category-admin-level-${level}`} key={category.id}>
        {isEditing ? (
          <form
            className="category-admin-edit"
            onSubmit={(event) => void handleCategoryEditSubmit(event)}
          >
            <input
              aria-label={`${category.name} 카테고리 이름`}
              autoFocus
              disabled={isBusy}
              onChange={(event) => setEditingCategoryName(event.target.value)}
              value={editingCategoryName}
            />
            <button disabled={isBusy || !editingCategoryName.trim()} type="submit">
              저장
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingCategoryId(null)
                setEditingCategoryName('')
              }}
            >
              취소
            </button>
          </form>
        ) : (
          <>
            <div className="category-admin-copy">
              <span>{category.name}</span>
              <small>{taskCount}개 할 일</small>
            </div>
            <div className="category-admin-actions">
              <button
                aria-label={`${category.name} 위로 이동`}
                className="icon-button"
                disabled={isBusy || categoryIndex === 0}
                type="button"
                onClick={() => void onMoveCategory(category.id, -1)}
              >
                <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                  <path d="M12 5a1 1 0 0 1 .7.3l6 6a1 1 0 1 1-1.4 1.4L13 8.4V18a1 1 0 1 1-2 0V8.4l-4.3 4.3a1 1 0 0 1-1.4-1.4l6-6A1 1 0 0 1 12 5Z" />
                </svg>
              </button>
              <button
                aria-label={`${category.name} 아래로 이동`}
                className="icon-button"
                disabled={isBusy || categoryIndex === siblings.length - 1}
                type="button"
                onClick={() => void onMoveCategory(category.id, 1)}
              >
                <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                  <path d="M12 19a1 1 0 0 1-.7-.3l-6-6a1 1 0 1 1 1.4-1.4L11 15.6V6a1 1 0 1 1 2 0v9.6l4.3-4.3a1 1 0 0 1 1.4 1.4l-6 6a1 1 0 0 1-.7.3Z" />
                </svg>
              </button>
              <button
                aria-label={`${category.name} 이름 변경`}
                className="icon-button"
                disabled={isBusy}
                type="button"
                onClick={() => startCategoryEdit(category)}
              >
                <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                  <path d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25ZM19.71 7.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.06 1.06 2.75 2.75 1.06-1.06Z" />
                </svg>
              </button>
              <button
                aria-label={`${category.name} 삭제`}
                className="icon-button delete-button"
                disabled={isBusy}
                type="button"
                onClick={() => void onRemoveCategory(category.id)}
              >
                <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                  <path d="M9 3h6a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2h-1v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4a1 1 0 0 1 0-2h4V4a1 1 0 0 1 1-1Zm2 2h2V5h-2Zm-4 2v13h10V7H7Z" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="modal-backdrop category-admin-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="카테고리 관리"
        aria-modal="true"
        className="task-modal category-admin-sheet"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h3>카테고리 관리</h3>
            <p>분류를 추가하고 순서를 정리하세요.</p>
          </div>
          <button
            aria-label="카테고리 관리 닫기"
            className="icon-button"
            type="button"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" role="presentation" focusable="false">
              <path d="M6.3 5.3a1 1 0 0 1 1.4 0L12 9.6l4.3-4.3a1 1 0 1 1 1.4 1.4L13.4 11l4.3 4.3a1 1 0 0 1-1.4 1.4L12 12.4l-4.3 4.3a1 1 0 0 1-1.4-1.4l4.3-4.3-4.3-4.3a1 1 0 0 1 0-1.4Z" />
            </svg>
          </button>
        </header>

        <form className="category-admin-add" onSubmit={(event) => void handleAddCategory(event)}>
          <input
            aria-label="새 상위 카테고리 이름"
            disabled={isBusy}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="새 상위 카테고리"
            value={newCategoryName}
          />
          <button disabled={isBusy || !newCategoryName.trim()} type="submit">
            추가
          </button>
        </form>

        <div className="category-admin-list">
          {topCategories.length === 0 ? (
            <p className="category-admin-empty">아직 카테고리가 없습니다.</p>
          ) : null}
          {topCategories.map((category) => (
            <section className="category-admin-group" key={category.id}>
              {renderCategoryRow(category, 0)}
              <form
                className="category-admin-subadd"
                onSubmit={(event) => void handleAddSubcategory(event, category.id)}
              >
                <input
                  aria-label={`${category.name} 하위 카테고리 이름`}
                  disabled={isBusy}
                  onChange={(event) =>
                    setSubcategoryNames((currentNames) => ({
                      ...currentNames,
                      [category.id]: event.target.value,
                    }))
                  }
                  placeholder="하위 카테고리 추가"
                  value={subcategoryNames[category.id] ?? ''}
                />
                <button
                  disabled={isBusy || !subcategoryNames[category.id]?.trim()}
                  type="submit"
                >
                  추가
                </button>
              </form>
              {getChildCategories(categories, category.id).map((childCategory) =>
                renderCategoryRow(childCategory, 1),
              )}
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}

export function DoListApp() {
  const auth = getFirebaseAuth()
  const userId = auth.currentUser?.uid ?? null
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('active')
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
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
          <span>{categories.length}개 분류</span>
        </div>
        <div className="category-manager-summary">
          <span>목록은 깔끔하게 보고, 분류 편집은 관리 화면에서 처리합니다.</span>
          <button
            disabled={isMutating}
            type="button"
            onClick={() => setIsCategoryManagerOpen(true)}
          >
            관리
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
                categories={categories}
                isBusy={isMutating}
                onAddTask={addTask}
                onCancel={() => setIsAddingTask(false)}
              />
            </div>
          ) : null}
          {isCategoryManagerOpen ? (
            <CategoryManagerSheet
              categories={categories}
              isBusy={isMutating}
              onAddCategory={addCategory}
              onClose={() => setIsCategoryManagerOpen(false)}
              onMoveCategory={moveCategory}
              onRenameCategory={renameCategory}
              onRemoveCategory={removeCategory}
              tasks={tasks}
            />
          ) : null}
        </>
      ) : null}
    </section>
  )
}
