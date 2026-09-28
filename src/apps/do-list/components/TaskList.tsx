import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Task, TaskCategory, TaskStatus } from '../types/task'

const statusLabels: Record<TaskStatus, string> = {
  todo: '할 일',
  doing: '진행 중',
  blocked: '막힘',
  done: '완료',
}

const statusOptions: Array<{ description: string; label: string; value: TaskStatus }> = [
  { description: '아직 시작하지 않은 작업', label: '할 일', value: 'todo' },
  { description: '지금 진행 중인 작업', label: '진행 중', value: 'doing' },
  { description: '외부 요인으로 멈춘 작업', label: '막힘', value: 'blocked' },
  { description: '완료되어 닫힌 작업', label: '완료', value: 'done' },
]

type CategoryGroup = {
  category: TaskCategory | null
  id: string
  isDefault: boolean
  level: number
  name: string
  tasks: Task[]
}

type TaskListProps = {
  categories: TaskCategory[]
  isBusy: boolean
  tasks: Task[]
  onAddCategory: (name: string, parentId?: string | null) => Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
  onEditTask: (
    taskId: string,
    title: string,
    description: string,
    dueDate: string | null,
    categoryId: string | null,
  ) => Promise<void>
  onMoveCategory: (categoryId: string, direction: -1 | 1) => Promise<void>
  onRenameCategory: (categoryId: string, name: string) => Promise<void>
  onRemoveCategory: (categoryId: string) => Promise<void>
  onUpdateStatus: (taskId: string, status: TaskStatus) => Promise<void>
}

function getChildCategories(categories: TaskCategory[], parentId: string | null) {
  return categories.filter((category) => category.parentId === parentId)
}

function getCategoryOptions(categories: TaskCategory[]) {
  const topCategories = getChildCategories(categories, null)

  return topCategories.flatMap((category) => {
    const childCategories = getChildCategories(categories, category.id).map((childCategory) => ({
      id: childCategory.id,
      name: `${category.name} / ${childCategory.name}`,
    }))

    return [{ id: category.id, name: category.name }, ...childCategories]
  })
}

export function TaskList({
  categories,
  isBusy,
  tasks,
  onAddCategory,
  onDeleteTask,
  onEditTask,
  onMoveCategory,
  onRenameCategory,
  onRemoveCategory,
  onUpdateStatus,
}: TaskListProps) {
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<string[]>([])
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [subcategoryNames, setSubcategoryNames] = useState<Record<string, string>>({})
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [statusTask, setStatusTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const categoryOptions = getCategoryOptions(categories)
  const taskGroups = useMemo(() => {
    const groups: CategoryGroup[] = [
      {
        category: null,
        id: '',
        isDefault: true,
        level: 0,
        name: '기본',
        tasks: tasks.filter((task) => !task.categoryId),
      },
    ]

    getChildCategories(categories, null).forEach((category) => {
      groups.push({
        category,
        id: category.id,
        isDefault: false,
        level: 0,
        name: category.name,
        tasks: tasks.filter((task) => task.categoryId === category.id),
      })

      getChildCategories(categories, category.id).forEach((childCategory) => {
        groups.push({
          category: childCategory,
          id: childCategory.id,
          isDefault: false,
          level: 1,
          name: childCategory.name,
          tasks: tasks.filter((task) => task.categoryId === childCategory.id),
        })
      })
    })

    return groups.filter((group) => group.tasks.length > 0 || !group.isDefault)
  }, [categories, tasks])

  useEffect(() => {
    if (!statusTask && !editingTask) {
      return undefined
    }

    history.pushState({ doListModal: true }, document.title, window.location.href)

    function handlePopState() {
      setStatusTask(null)
      closeEditModal()
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [editingTask, statusTask])

  function openEditModal(task: Task) {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description)
    setEditDueDate(task.dueDate ?? '')
    setEditCategoryId(task.categoryId ?? '')
  }

  function closeEditModal() {
    setEditingTask(null)
    setEditTitle('')
    setEditDescription('')
    setEditDueDate('')
    setEditCategoryId('')
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingTask || !editTitle.trim()) {
      return
    }

    await onEditTask(
      editingTask.id,
      editTitle,
      editDescription,
      editDueDate || null,
      editCategoryId || null,
    )
    closeEditModal()
  }

  async function handleStatusChange(status: TaskStatus) {
    if (!statusTask) {
      return
    }

    await onUpdateStatus(statusTask.id, status)
    setStatusTask(null)
  }

  function toggleCategory(categoryId: string) {
    setCollapsedCategoryIds((currentIds) => {
      if (currentIds.includes(categoryId)) {
        return currentIds.filter((id) => id !== categoryId)
      }

      return [...currentIds, categoryId]
    })
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

  return (
    <>
      <div className="category-groups">
        {taskGroups.length === 0 ? (
          <div className="empty-state note-empty-state">
            <span aria-hidden="true">✓</span>
            <strong>아직 할 일이 없어요</strong>
            <p>+ 버튼을 눌러 첫 할 일을 추가하세요.</p>
          </div>
        ) : null}
        {taskGroups.map((group) => {
          const isCollapsed = collapsedCategoryIds.includes(group.id)
          const category = group.category
          const siblings = category ? getChildCategories(categories, category.parentId) : []
          const categoryIndex = category
            ? siblings.findIndex((sibling) => sibling.id === category.id)
            : -1
          const isTopCategory = Boolean(category && !category.parentId)

          return (
            <section
              className={`category-group category-level-${group.level}`}
              key={group.id || 'default'}
            >
              <header className="category-group-header">
                {editingCategoryId === group.id ? (
                  <form
                    className="category-edit-form"
                    onSubmit={(event) => void handleCategoryEditSubmit(event)}
                  >
                    <input
                      aria-label={`${group.name} 카테고리 이름`}
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
                    <button
                      aria-expanded={!isCollapsed}
                      className="category-toggle"
                      type="button"
                      onClick={() => toggleCategory(group.id)}
                    >
                      <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                        <path d="M8.3 9.3a1 1 0 0 1 1.4 0L12 11.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-3 3a1 1 0 0 1-1.4 0l-3-3a1 1 0 0 1 0-1.4Z" />
                      </svg>
                      <span>{group.name}</span>
                      <small>{group.tasks.length}</small>
                    </button>
                    {!group.isDefault && category ? (
                      <div className="category-actions">
                        <button
                          aria-label={`${group.name} 우선순위 올리기`}
                          className="icon-button"
                          disabled={isBusy || categoryIndex === 0}
                          type="button"
                          onClick={() => void onMoveCategory(group.id, -1)}
                        >
                          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                            <path d="M12 5a1 1 0 0 1 .7.3l6 6a1 1 0 1 1-1.4 1.4L13 8.4V18a1 1 0 1 1-2 0V8.4l-4.3 4.3a1 1 0 0 1-1.4-1.4l6-6A1 1 0 0 1 12 5Z" />
                          </svg>
                        </button>
                        <button
                          aria-label={`${group.name} 우선순위 내리기`}
                          className="icon-button"
                          disabled={isBusy || categoryIndex === siblings.length - 1}
                          type="button"
                          onClick={() => void onMoveCategory(group.id, 1)}
                        >
                          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                            <path d="M12 19a1 1 0 0 1-.7-.3l-6-6a1 1 0 1 1 1.4-1.4L11 15.6V6a1 1 0 1 1 2 0v9.6l4.3-4.3a1 1 0 0 1 1.4 1.4l-6 6a1 1 0 0 1-.7.3Z" />
                          </svg>
                        </button>
                        <button
                          aria-label={`${group.name} 카테고리 수정`}
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
                          aria-label={`${group.name} 카테고리 삭제`}
                          className="icon-button delete-button"
                          disabled={isBusy}
                          type="button"
                          onClick={() => void onRemoveCategory(group.id)}
                        >
                          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                            <path d="M9 3h6a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2h-1v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4a1 1 0 0 1 0-2h4V4a1 1 0 0 1 1-1Zm2 2h2V5h-2Zm-4 2v13h10V7H7Z" />
                          </svg>
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </header>

              {isTopCategory ? (
                <form
                  className="subcategory-form"
                  onSubmit={(event) => void handleAddSubcategory(event, group.id)}
                >
                  <input
                    aria-label={`${group.name} 하위 카테고리 이름`}
                    disabled={isBusy}
                    onChange={(event) =>
                      setSubcategoryNames((currentNames) => ({
                        ...currentNames,
                        [group.id]: event.target.value,
                      }))
                    }
                    placeholder="하위 카테고리 추가"
                    value={subcategoryNames[group.id] ?? ''}
                  />
                  <button
                    disabled={isBusy || !subcategoryNames[group.id]?.trim()}
                    type="submit"
                  >
                    추가
                  </button>
                </form>
              ) : null}

              {!isCollapsed && group.tasks.length === 0 ? (
                <p className="category-empty">이 카테고리에는 아직 할 일이 없습니다.</p>
              ) : null}

              {!isCollapsed && group.tasks.length > 0 ? (
                <ul className="task-list">
                  {group.tasks.map((task) => (
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
                        {task.dueDate ? (
                          <span className="due-date">기한 {task.dueDate}</span>
                        ) : null}
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
                            aria-label={`${task.title} 수정`}
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
                            aria-label={`${task.title} 삭제`}
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
              ) : null}
            </section>
          )
        })}
      </div>

      {statusTask ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setStatusTask(null)}
        >
          <section
            aria-label={`${statusTask.title} 상태 변경`}
            aria-modal="true"
            className="task-modal status-sheet"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <div>
                <h3>상태 변경</h3>
                <p>{statusTask.title}</p>
              </div>
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
              {statusOptions.map((option) => (
                <button
                  aria-current={statusTask.status === option.value ? 'true' : undefined}
                  className={`status-option status-text-${option.value}`}
                  disabled={isBusy}
                  key={option.value}
                  type="button"
                  onClick={() => void handleStatusChange(option.value)}
                >
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  {statusTask.status === option.value ? (
                    <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                      <path d="M9.4 16.6 4.8 12a1 1 0 1 1 1.4-1.4l3.2 3.2 8.4-8.4a1 1 0 1 1 1.4 1.4l-9.1 9.1a1 1 0 0 1-1.4 0Z" />
                    </svg>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {editingTask ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={closeEditModal}
        >
          <section
            aria-label={`${editingTask.title} 수정`}
            aria-modal="true"
            className="task-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
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
              <label className="field-label">
                <span>카테고리</span>
                <select
                  disabled={isBusy}
                  onChange={(event) => setEditCategoryId(event.target.value)}
                  value={editCategoryId}
                >
                  <option value="">기본</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
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
