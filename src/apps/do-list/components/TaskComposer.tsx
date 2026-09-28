import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { RecurringScheduleType, TaskCategory, TaskStatus } from '../types/task'

type RepeatOption = 'none' | RecurringScheduleType

type TaskComposerProps = {
  categories: TaskCategory[]
  isBusy: boolean
  onCancel: () => void
  onAddRecurringTask: (
    title: string,
    description: string,
    scheduleType: RecurringScheduleType,
    startDate: string,
    categoryId: string | null,
    intervalDays: number | null,
  ) => Promise<void>
  onAddTask: (
    title: string,
    description: string,
    status: TaskStatus,
    dueDate: string | null,
    categoryId: string | null,
  ) => Promise<void>
}

const statusOptions: Array<{ label: string; value: TaskStatus }> = [
  { label: '할 일', value: 'todo' },
  { label: '진행 중', value: 'doing' },
  { label: '막힘', value: 'blocked' },
  { label: '완료', value: 'done' },
]

const repeatOptions: Array<{ label: string; value: RepeatOption }> = [
  { label: '반복 안 함', value: 'none' },
  { label: '매일', value: 'daily' },
  { label: '매주', value: 'weekly' },
  { label: '매월', value: 'monthly' },
  { label: '특정 주기', value: 'interval' },
]

function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getCategoryOptions(categories: TaskCategory[]) {
  const topCategories = categories.filter((category) => !category.parentId)

  return topCategories.flatMap((category) => {
    const childCategories = categories
      .filter((childCategory) => childCategory.parentId === category.id)
      .map((childCategory) => ({
        id: childCategory.id,
        name: `${category.name} / ${childCategory.name}`,
      }))

    return [{ id: category.id, name: category.name }, ...childCategories]
  })
}

export function TaskComposer({
  categories,
  isBusy,
  onAddRecurringTask,
  onAddTask,
  onCancel,
}: TaskComposerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [dueDate, setDueDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [repeatOption, setRepeatOption] = useState<RepeatOption>('none')
  const [intervalDays, setIntervalDays] = useState(2)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const categoryOptions = getCategoryOptions(categories)

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!title.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      if (repeatOption === 'none') {
        await onAddTask(title, description, status, dueDate || null, categoryId || null)
      } else {
        await onAddRecurringTask(
          title,
          description,
          repeatOption,
          dueDate || getTodayString(),
          categoryId || null,
          repeatOption === 'interval' ? intervalDays : null,
        )
      }
      setTitle('')
      setDescription('')
      setStatus('todo')
      setDueDate('')
      setCategoryId('')
      setRepeatOption('none')
      setIntervalDays(2)
      onCancel()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="task-composer sheet-form" onSubmit={handleSubmit}>
      <div className="sheet-handle" aria-hidden="true" />
      <header className="sheet-header">
        <h3>할 일 추가</h3>
      </header>
      <div className="task-fields">
        <label className="field-label">
          <span>제목</span>
          <input
            aria-label="할 일 제목"
            disabled={isSubmitting || isBusy}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="무엇을 해야 하나요?"
            ref={titleInputRef}
            type="text"
            value={title}
          />
        </label>
        <label className="field-label">
          <span>메모</span>
          <textarea
            aria-label="할 일 메모"
            disabled={isSubmitting || isBusy}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="필요한 내용을 적어두세요"
            rows={3}
            value={description}
          />
        </label>
      </div>
      <label className="field-label">
        <span>상태</span>
        <select
          aria-label="초기 상태"
          className={`status-select status-text-${status}`}
          disabled={isSubmitting || isBusy}
          onChange={(event) => setStatus(event.target.value as TaskStatus)}
          value={status}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        <span>기한</span>
        <input
          aria-label="기한"
          disabled={isSubmitting || isBusy}
          onChange={(event) => setDueDate(event.target.value)}
          type="date"
          value={dueDate}
        />
      </label>
      <label className="field-label">
        <span>반복</span>
        <select
          aria-label="반복 설정"
          disabled={isSubmitting || isBusy}
          onChange={(event) => setRepeatOption(event.target.value as RepeatOption)}
          value={repeatOption}
        >
          {repeatOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {repeatOption === 'interval' ? (
        <label className="field-label">
          <span>며칠마다</span>
          <input
            aria-label="반복 간격"
            disabled={isSubmitting || isBusy}
            min={1}
            onChange={(event) => setIntervalDays(Number(event.target.value))}
            type="number"
            value={intervalDays}
          />
        </label>
      ) : null}
      <label className="field-label">
        <span>카테고리</span>
        <select
          aria-label="카테고리"
          disabled={isSubmitting || isBusy}
          onChange={(event) => setCategoryId(event.target.value)}
          value={categoryId}
        >
          <option value="">기본</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <div className="sheet-actions">
        <button type="button" onClick={onCancel}>
          취소
        </button>
        <button disabled={isSubmitting || isBusy || !title.trim()} type="submit">
          {isSubmitting ? '저장 중' : '추가'}
        </button>
      </div>
    </form>
  )
}
