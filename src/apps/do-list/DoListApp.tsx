import { useMemo, useState, type FormEvent } from 'react'
import { signOut } from 'firebase/auth'
import { TaskComposer } from './components/TaskComposer'
import { TaskList } from './components/TaskList'
import { getFirebaseAuth } from '../../services/firebase'
import { useTasks } from './hooks/useTasks'
import type { RecurringTask, Task, TaskCategory, TaskStatus } from './types/task'

type TaskFilter = 'active' | TaskStatus
type DoListTab = 'list' | 'stats'
type StatsPeriod = 'day' | 'month' | 'year'

const filterItems: Array<{ label: string; value: TaskFilter }> = [
  { label: '미완료', value: 'active' },
  { label: '할 일', value: 'todo' },
  { label: '진행 중', value: 'doing' },
  { label: '막힘', value: 'blocked' },
  { label: '완료', value: 'done' },
]

const statsPeriodItems: Array<{ label: string; value: StatsPeriod }> = [
  { label: '일', value: 'day' },
  { label: '월', value: 'month' },
  { label: '년', value: 'year' },
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

function getCategoryName(categories: TaskCategory[], categoryId: string | null) {
  if (!categoryId) {
    return '기본'
  }

  const category = categories.find((currentCategory) => currentCategory.id === categoryId)

  if (!category) {
    return '알 수 없음'
  }

  if (!category.parentId) {
    return category.name
  }

  const parentCategory = categories.find((currentCategory) => {
    return currentCategory.id === category.parentId
  })

  return parentCategory ? `${parentCategory.name} / ${category.name}` : category.name
}

function getDateParts(timestamp: number | null) {
  if (!timestamp) {
    return null
  }

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return {
    day: formatLocalDate(date),
    month: formatLocalMonth(date),
    year: String(date.getFullYear()),
  }
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatLocalMonth(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function getCurrentPeriodKey(period: StatsPeriod) {
  const now = new Date()

  if (period === 'year') {
    return String(now.getFullYear())
  }

  if (period === 'month') {
    return formatLocalMonth(now)
  }

  return formatLocalDate(now)
}

function getPeriodLabel(period: StatsPeriod, periodKey: string) {
  if (period === 'year') {
    return `${periodKey}년`
  }

  if (period === 'month') {
    const [year, month] = periodKey.split('-')
    return `${year}년 ${Number(month)}월`
  }

  const [year, month, day] = periodKey.split('-')
  return `${year}년 ${Number(month)}월 ${Number(day)}일`
}

function isTaskInPeriod(task: Task, period: StatsPeriod, periodKey: string) {
  return getDateParts(task.createdAt)?.[period] === periodKey
}

function isTaskCompletedInPeriod(task: Task, period: StatsPeriod, periodKey: string) {
  if (task.status !== 'done') {
    return false
  }

  const completedAt = task.completedAt ?? (task.status === 'done' ? task.updatedAt : null)

  return getDateParts(completedAt)?.[period] === periodKey
}

function getTaskDedupeKey(task: Task) {
  if (task.recurringTaskId && task.recurringOccurrenceKey) {
    return `${task.recurringTaskId}:${task.recurringOccurrenceKey}`
  }

  return task.id
}

function shouldReplaceDuplicateTask(currentTask: Task, nextTask: Task) {
  if (currentTask.status !== 'done' && nextTask.status === 'done') {
    return true
  }

  if (currentTask.status === 'done' && nextTask.status !== 'done') {
    return false
  }

  return (
    (nextTask.updatedAt ?? nextTask.createdAt ?? 0) >
    (currentTask.updatedAt ?? currentTask.createdAt ?? 0)
  )
}

function getUniqueTasks(tasks: Task[]) {
  const uniqueTasks = new Map<string, Task>()

  tasks.forEach((task) => {
    const taskKey = getTaskDedupeKey(task)
    const currentTask = uniqueTasks.get(taskKey)

    if (!currentTask || shouldReplaceDuplicateTask(currentTask, task)) {
      uniqueTasks.set(taskKey, task)
    }
  })

  return Array.from(uniqueTasks.values()).sort((firstTask, secondTask) => {
    if (firstTask.order !== secondTask.order) {
      return firstTask.order - secondTask.order
    }

    return (secondTask.createdAt ?? 0) - (firstTask.createdAt ?? 0)
  })
}

function getRecurringTaskTitle(recurringTasks: RecurringTask[], recurringTaskId: string) {
  return recurringTasks.find((recurringTask) => recurringTask.id === recurringTaskId)?.title
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
            <span className="category-admin-marker" aria-hidden="true" />
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
            <p>상위 {topCategories.length}개 · 전체 {categories.length}개</p>
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
  const [activeTab, setActiveTab] = useState<DoListTab>('list')
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('active')
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('day')
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const {
    categories,
    recurringTasks,
    tasks,
    isLoading,
    isMutating,
    error,
    addCategory,
    addRecurringTask,
    addTask,
    editTask,
    moveCategory,
    moveTask,
    renameCategory,
    removeCategory,
    removeTask,
    setTaskStatus,
  } = useTasks(userId)
  const uniqueTasks = useMemo(() => getUniqueTasks(tasks), [tasks])
  const taskCounts = useMemo(() => {
    return uniqueTasks.reduce(
      (counts, task) => {
        if (task.status !== 'done') {
          counts.active += 1
        }
        counts[task.status] += 1
        return counts
      },
      { active: 0, blocked: 0, doing: 0, done: 0, todo: 0 },
    )
  }, [uniqueTasks])
  const visibleTasks = useMemo(() => {
    if (activeFilter === 'active') {
      return uniqueTasks.filter((task) => task.status !== 'done')
    }

    return uniqueTasks.filter((task) => task.status === activeFilter)
  }, [activeFilter, uniqueTasks])
  const activeCount = taskCounts.todo + taskCounts.doing + taskCounts.blocked
  const statsPeriodKey = getCurrentPeriodKey(statsPeriod)
  const periodTasks = useMemo(() => {
    return uniqueTasks.filter((task) => isTaskInPeriod(task, statsPeriod, statsPeriodKey))
  }, [statsPeriod, statsPeriodKey, uniqueTasks])
  const periodCompletedTasks = useMemo(() => {
    return uniqueTasks.filter((task) => isTaskCompletedInPeriod(task, statsPeriod, statsPeriodKey))
  }, [statsPeriod, statsPeriodKey, uniqueTasks])
  const periodTaskCounts = useMemo(() => {
    return periodTasks.reduce(
      (counts, task) => {
        if (task.status !== 'done') {
          counts.active += 1
        }
        counts[task.status] += 1
        return counts
      },
      { active: 0, blocked: 0, doing: 0, done: 0, todo: 0 },
    )
  }, [periodTasks])
  const categoryStats = useMemo(() => {
    const categoryCounts = periodTasks.reduce<Record<string, number>>((counts, task) => {
      const categoryKey = task.categoryId ?? ''
      counts[categoryKey] = (counts[categoryKey] ?? 0) + 1
      return counts
    }, {})

    return Object.entries(categoryCounts)
      .map(([categoryId, count]) => ({
        count,
        id: categoryId || 'default',
        name: getCategoryName(categories, categoryId || null),
      }))
      .sort((firstStat, secondStat) => secondStat.count - firstStat.count)
      .slice(0, 5)
  }, [categories, periodTasks])
  const completedTaskStats = useMemo(() => {
    type CompletedTaskStat = {
      count: number
      id: string
      isRecurring: boolean
      title: string
    }

    const completedCounts = periodCompletedTasks.reduce<Record<string, CompletedTaskStat>>((counts, task) => {
      const taskKey = task.recurringTaskId ?? task.id
      const title = task.recurringTaskId
        ? getRecurringTaskTitle(recurringTasks, task.recurringTaskId) ?? task.title
        : task.title
      const currentCount = counts[taskKey]?.count ?? 0

      counts[taskKey] = {
        count: currentCount + 1,
        id: taskKey,
        isRecurring: Boolean(task.recurringTaskId),
        title,
      }

      return counts
    }, {})

    return Object.values(completedCounts)
      .sort((firstStat, secondStat) => secondStat.count - firstStat.count)
      .slice(0, 6)
  }, [periodCompletedTasks, recurringTasks])
  const maxCompletedTaskCount = Math.max(
    1,
    ...completedTaskStats.map((stat) => stat.count),
  )
  const recurringCompletionStats = useMemo(() => {
    const periodCounts = periodCompletedTasks.reduce<Record<string, number>>((counts, task) => {
      if (task.recurringTaskId) {
        counts[task.recurringTaskId] = (counts[task.recurringTaskId] ?? 0) + 1
      }

      return counts
    }, {})

    return recurringTasks
      .map((recurringTask) => ({
        completedCount: recurringTask.completedCount,
        id: recurringTask.id,
        periodCount: periodCounts[recurringTask.id] ?? 0,
        title: recurringTask.title,
      }))
      .filter((stat) => stat.completedCount > 0 || stat.periodCount > 0)
      .sort((firstStat, secondStat) => {
        if (secondStat.periodCount !== firstStat.periodCount) {
          return secondStat.periodCount - firstStat.periodCount
        }

        return secondStat.completedCount - firstStat.completedCount
      })
      .slice(0, 6)
  }, [periodCompletedTasks, recurringTasks])
  const completionRate =
    periodTasks.length > 0
      ? Math.round((periodCompletedTasks.length / periodTasks.length) * 100)
      : 0

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
        <button
          aria-label="카테고리 관리 열기"
          className="title-action-button"
          disabled={isMutating}
          type="button"
          onClick={() => setIsCategoryManagerOpen(true)}
        >
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M4 7a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm10-1h5a1 1 0 1 1 0 2h-5a1 1 0 1 1 0-2ZM4 12a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm14-1h1a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2ZM4 17a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm8-1h7a1 1 0 1 1 0 2h-7a1 1 0 1 1 0-2Z" />
          </svg>
          <span>카테고리</span>
        </button>
      </div>

      <nav className="do-list-tabs" aria-label="Do List views">
        <button
          aria-current={activeTab === 'list' ? 'page' : undefined}
          type="button"
          onClick={() => setActiveTab('list')}
        >
          목록
        </button>
        <button
          aria-current={activeTab === 'stats' ? 'page' : undefined}
          type="button"
          onClick={() => setActiveTab('stats')}
        >
          통계
        </button>
      </nav>

      {activeTab === 'list' ? (
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
      ) : null}

      {activeTab === 'stats' ? (
        <section className="stats-panel" aria-label="Do List 통계">
          <div className="stats-period-bar" aria-label="통계 기간">
            {statsPeriodItems.map((periodItem) => (
              <button
                aria-current={statsPeriod === periodItem.value ? 'true' : undefined}
                key={periodItem.value}
                type="button"
                onClick={() => setStatsPeriod(periodItem.value)}
              >
                {periodItem.label}
              </button>
            ))}
          </div>
          <p className="stats-period-label">{getPeriodLabel(statsPeriod, statsPeriodKey)}</p>
          <div className="stats-grid">
            <article className="stat-card primary">
              <span>완료율</span>
              <strong>{completionRate}%</strong>
              <small>
                {periodCompletedTasks.length}/{periodTasks.length || 0} 완료
              </small>
            </article>
            <article className="stat-card">
              <span>생성</span>
              <strong>{periodTasks.length}</strong>
              <small>기간 내 추가</small>
            </article>
            <article className="stat-card">
              <span>완료</span>
              <strong>{periodCompletedTasks.length}</strong>
              <small>기간 내 완료</small>
            </article>
          </div>
          <div className="stats-section">
            <h3>완료한 할 일</h3>
            {completedTaskStats.length > 0 ? (
              <div className="completion-chart">
                {completedTaskStats.map((stat) => (
                  <div className="completion-chart-row" key={stat.id}>
                    <div className="completion-chart-copy">
                      <span>{stat.title}</span>
                      {stat.isRecurring ? <small>반복</small> : null}
                    </div>
                    <div
                      aria-label={`${stat.title} ${stat.count}회 완료`}
                      className="completion-bar-track"
                    >
                      <span
                        className="completion-bar-fill"
                        style={{ width: `${Math.max(8, (stat.count / maxCompletedTaskCount) * 100)}%` }}
                      />
                    </div>
                    <strong>{stat.count}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="stats-empty">이 기간에 완료한 할 일이 없습니다.</p>
            )}
          </div>
          <div className="stats-section">
            <h3>반복업무 완료</h3>
            {recurringCompletionStats.length > 0 ? (
              <div className="recurring-completion-list">
                {recurringCompletionStats.map((stat) => (
                  <div className="recurring-completion-row" key={stat.id}>
                    <span>{stat.title}</span>
                    <strong>{stat.completedCount}회</strong>
                    <small>이 기간 {stat.periodCount}회</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="stats-empty">완료한 반복업무가 없습니다.</p>
            )}
          </div>
          <div className="stats-section">
            <h3>상태별</h3>
            <div className="status-stats">
              {filterItems
                .filter((filter) => filter.value !== 'active')
                .map((filter) => (
                  <div className="status-stat-row" key={filter.value}>
                    <span>{filter.label}</span>
                    <strong>{periodTaskCounts[filter.value]}</strong>
                  </div>
                ))}
            </div>
          </div>
          <div className="stats-section">
            <h3>카테고리별</h3>
            {categoryStats.length > 0 ? (
              <div className="category-stat-list">
                {categoryStats.map((stat) => (
                  <div className="category-stat-row" key={stat.id}>
                    <span>{stat.name}</span>
                    <strong>{stat.count}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="stats-empty">아직 집계할 할 일이 없습니다.</p>
            )}
          </div>
        </section>
      ) : null}

      {error ? <p className="app-error">{error}</p> : null}
      {isLoading ? (
        <div className="task-skeleton-list" aria-label="할 일 불러오는 중">
          <div />
          <div />
          <div />
        </div>
      ) : null}

      {!isLoading && !error && activeTab === 'list' ? (
        <>
          <TaskList
            categories={categories}
            isBusy={isMutating}
            onDeleteTask={removeTask}
            onEditTask={editTask}
            onMoveTask={moveTask}
            onUpdateStatus={setTaskStatus}
            recurringTasks={recurringTasks}
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
        </>
      ) : null}

      {!isLoading && !error ? (
        <>
          {isAddingTask ? (
            <div className="sheet-backdrop" role="presentation">
              <TaskComposer
                categories={categories}
                isBusy={isMutating}
                onAddRecurringTask={addRecurringTask}
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
              tasks={uniqueTasks}
            />
          ) : null}
        </>
      ) : null}
    </section>
  )
}
