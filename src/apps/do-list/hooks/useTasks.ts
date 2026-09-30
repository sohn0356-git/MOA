import { useEffect, useMemo, useRef, useState } from 'react'
import { getFirebaseConfigError } from '../../../services/firebase'
import {
  createCategory,
  createRecurringTask,
  createTask,
  deleteCategory,
  deleteRecurringTask,
  deleteTask,
  incrementRecurringTaskCompletedCount,
  subscribeToCategories,
  subscribeToRecurringTasks,
  subscribeToTasks,
  updateCategoriesOrder,
  updateCategory,
  updateRecurringTask,
  updateTask,
  updateTasksOrder,
} from '../services/taskService'
import type {
  RecurringScheduleType,
  RecurringTask,
  Task,
  TaskCategory,
  TaskStatus,
} from '../types/task'

const MAX_RECURRING_OCCURRENCES_PER_SYNC = 60

function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(dateString: string, days: number) {
  const date = parseDate(dateString)
  date.setDate(date.getDate() + days)

  return formatDate(date)
}

function addMonths(dateString: string, months: number) {
  const date = parseDate(dateString)
  const originalDay = date.getDate()

  date.setDate(1)
  date.setMonth(date.getMonth() + months)

  const lastDayOfTargetMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate()
  date.setDate(Math.min(originalDay, lastDayOfTargetMonth))

  return formatDate(date)
}

function getNextRecurringDate(recurringTask: RecurringTask, dueDate: string) {
  return getNextRecurringDateForSchedule(
    recurringTask.scheduleType,
    recurringTask.intervalDays,
    dueDate,
  )
}

function getNextRecurringDateForSchedule(
  scheduleType: RecurringScheduleType,
  intervalDays: number | null,
  dueDate: string,
) {
  if (scheduleType === 'weekly') {
    return addDays(dueDate, 7)
  }

  if (scheduleType === 'monthly') {
    return addMonths(dueDate, 1)
  }

  if (scheduleType === 'interval') {
    return addDays(dueDate, intervalDays ?? 1)
  }

  return addDays(dueDate, 1)
}

function getRecurringOccurrencesDue(recurringTask: RecurringTask, today: string) {
  const occurrences: string[] = []
  let nextDueDate = recurringTask.nextDueDate || recurringTask.startDate

  while (
    nextDueDate <= today &&
    occurrences.length < MAX_RECURRING_OCCURRENCES_PER_SYNC
  ) {
    occurrences.push(nextDueDate)
    nextDueDate = getNextRecurringDate(recurringTask, nextDueDate)
  }

  return { nextDueDate, occurrences }
}

export function useTasks(userId: string | null) {
  const configError = useMemo(() => getFirebaseConfigError(), [])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(!configError && Boolean(userId))
  const [error, setError] = useState<string | null>(configError)
  const [isMutating, setIsMutating] = useState(false)
  const [syncMessage, setSyncMessage] = useState(
    configError ? 'Firebase is not configured.' : 'Connecting to Realtime DB...',
  )
  const pendingRecurringOccurrenceKeys = useRef(new Set<string>())

  function requireUserId() {
    if (!userId) {
      throw new Error('Login is required.')
    }

    return userId
  }

  useEffect(() => {
    if (configError || !userId) {
      return undefined
    }

    let didLoadCategories = false
    let didLoadRecurringTasks = false
    let didLoadTasks = false

    function markLoaded(type: 'categories' | 'recurringTasks' | 'tasks') {
      if (type === 'tasks') {
        didLoadTasks = true
      } else if (type === 'recurringTasks') {
        didLoadRecurringTasks = true
      } else {
        didLoadCategories = true
      }

      if (didLoadTasks && didLoadCategories && didLoadRecurringTasks) {
        setIsLoading(false)
      }
    }

    const unsubscribeTasks = subscribeToTasks(
      userId,
      (nextTasks) => {
        const nextGeneratedOccurrenceKeys = new Set(
          nextTasks
            .filter((task) => task.recurringTaskId && task.recurringOccurrenceKey)
            .map((task) => `${task.recurringTaskId}:${task.recurringOccurrenceKey}`),
        )

        nextGeneratedOccurrenceKeys.forEach((occurrenceKey) => {
          pendingRecurringOccurrenceKeys.current.delete(occurrenceKey)
        })
        setTasks(nextTasks)
        setError(null)
        setSyncMessage('Synced with Realtime DB.')
        markLoaded('tasks')
      },
      (snapshotError) => {
        setError(snapshotError.message)
        setIsLoading(false)
        setSyncMessage('Realtime DB sync failed.')
      },
    )

    const unsubscribeCategories = subscribeToCategories(
      userId,
      (nextCategories) => {
        setCategories(nextCategories)
        setError(null)
        markLoaded('categories')
      },
      (snapshotError) => {
        setError(snapshotError.message)
        setIsLoading(false)
      },
    )

    const unsubscribeRecurringTasks = subscribeToRecurringTasks(
      userId,
      (nextRecurringTasks) => {
        setRecurringTasks(nextRecurringTasks)
        setError(null)
        markLoaded('recurringTasks')
      },
      (snapshotError) => {
        setError(snapshotError.message)
        setIsLoading(false)
      },
    )

    return () => {
      unsubscribeTasks()
      unsubscribeCategories()
      unsubscribeRecurringTasks()
    }
  }, [configError, userId])

  useEffect(() => {
    if (configError || !userId || isLoading || recurringTasks.length === 0) {
      return
    }

    const today = getTodayString()
    const generatedOccurrenceKeys = new Set(
      tasks
        .filter((task) => task.recurringTaskId && task.recurringOccurrenceKey)
        .map((task) => `${task.recurringTaskId}:${task.recurringOccurrenceKey}`),
    )
    const currentUserId = userId
    let didCancel = false

    async function syncRecurringTasks() {
      const activeRecurringTasks = recurringTasks.filter((recurringTask) => {
        return recurringTask.isActive && recurringTask.nextDueDate <= today
      })

      for (const recurringTask of activeRecurringTasks) {
        if (didCancel) {
          return
        }

        const { nextDueDate, occurrences } = getRecurringOccurrencesDue(
          recurringTask,
          today,
        )
        const missingOccurrences = occurrences.filter((occurrenceDate) => {
          const occurrenceKey = `${recurringTask.id}:${occurrenceDate}`

          return (
            !generatedOccurrenceKeys.has(occurrenceKey) &&
            !pendingRecurringOccurrenceKeys.current.has(occurrenceKey)
          )
        })

        await Promise.all(
          missingOccurrences.map(async (occurrenceDate) => {
            const occurrenceKey = `${recurringTask.id}:${occurrenceDate}`
            pendingRecurringOccurrenceKeys.current.add(occurrenceKey)

            try {
              await createTask({
                categoryId: recurringTask.categoryId,
                description: recurringTask.description,
                dueDate: occurrenceDate,
                recurringOccurrenceKey: occurrenceDate,
                recurringTaskId: recurringTask.id,
                status: 'todo',
                title: recurringTask.title,
                userId: currentUserId,
              })
            } catch (createTaskError) {
              pendingRecurringOccurrenceKeys.current.delete(occurrenceKey)
              throw createTaskError
            }
          }),
        )

        await updateRecurringTask(currentUserId, recurringTask.id, {
          lastGeneratedDate: occurrences.at(-1) ?? recurringTask.lastGeneratedDate,
          nextDueDate,
        })
      }
    }

    void syncRecurringTasks().catch((syncError) => {
      if (!didCancel) {
        setError(
          syncError instanceof Error
            ? syncError.message
            : 'Failed to sync recurring tasks.',
        )
      }
    })

    return () => {
      didCancel = true
    }
  }, [configError, isLoading, recurringTasks, tasks, userId])

  async function addTask(
    title: string,
    description: string,
    status: TaskStatus,
    dueDate: string | null,
    categoryId: string | null,
  ) {
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    if (!trimmedTitle) {
      return
    }

    setIsMutating(true)
    setSyncMessage('Saving to Realtime DB...')

    try {
      const currentUserId = requireUserId()

      await createTask({
        description: trimmedDescription,
        dueDate,
        categoryId,
        status,
        title: trimmedTitle,
        userId: currentUserId,
      })
      setSyncMessage('Saved. Waiting for realtime update...')
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Failed to save task.')
      setSyncMessage('Save failed.')
      throw taskError
    } finally {
      setIsMutating(false)
    }
  }

  async function addCategory(name: string, parentId: string | null = null) {
    const trimmedName = name.trim()

    if (!trimmedName) {
      return
    }

    setIsMutating(true)

    try {
      const siblingCount = categories.filter((category) => {
        return category.parentId === parentId
      }).length

      await createCategory(requireUserId(), trimmedName, siblingCount, parentId)
    } catch (categoryError) {
      setError(
        categoryError instanceof Error
          ? categoryError.message
          : 'Failed to save category.',
      )
      throw categoryError
    } finally {
      setIsMutating(false)
    }
  }

  async function addRecurringTask(
    title: string,
    description: string,
    scheduleType: RecurringScheduleType,
    startDate: string,
    categoryId: string | null,
    intervalDays: number | null,
  ) {
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    if (!trimmedTitle || !startDate) {
      return
    }

    setIsMutating(true)

    try {
      await createRecurringTask(requireUserId(), {
        categoryId,
        description: trimmedDescription,
        intervalDays: scheduleType === 'interval' ? Math.max(1, intervalDays ?? 1) : null,
        nextDueDate: startDate,
        scheduleType,
        startDate,
        title: trimmedTitle,
      })
    } catch (recurringTaskError) {
      setError(
        recurringTaskError instanceof Error
          ? recurringTaskError.message
          : 'Failed to save recurring task.',
      )
      throw recurringTaskError
    } finally {
      setIsMutating(false)
    }
  }

  async function toggleRecurringTask(recurringTaskId: string, isActive: boolean) {
    setIsMutating(true)

    try {
      await updateRecurringTask(requireUserId(), recurringTaskId, { isActive })
    } catch (recurringTaskError) {
      setError(
        recurringTaskError instanceof Error
          ? recurringTaskError.message
          : 'Failed to update recurring task.',
      )
      throw recurringTaskError
    } finally {
      setIsMutating(false)
    }
  }

  async function removeRecurringTask(recurringTaskId: string) {
    setIsMutating(true)

    try {
      await deleteRecurringTask(requireUserId(), recurringTaskId)
    } catch (recurringTaskError) {
      setError(
        recurringTaskError instanceof Error
          ? recurringTaskError.message
          : 'Failed to delete recurring task.',
      )
      throw recurringTaskError
    } finally {
      setIsMutating(false)
    }
  }

  async function renameCategory(categoryId: string, name: string) {
    const trimmedName = name.trim()

    if (!trimmedName) {
      return
    }

    setIsMutating(true)

    try {
      await updateCategory(requireUserId(), categoryId, { name: trimmedName })
    } catch (categoryError) {
      setError(
        categoryError instanceof Error
          ? categoryError.message
          : 'Failed to update category.',
      )
      throw categoryError
    } finally {
      setIsMutating(false)
    }
  }

  async function moveCategory(categoryId: string, direction: -1 | 1) {
    const movingCategory = categories.find((category) => category.id === categoryId)

    if (!movingCategory) {
      return
    }

    const siblings = categories.filter((category) => {
      return category.parentId === movingCategory.parentId
    })
    const currentIndex = siblings.findIndex((category) => category.id === categoryId)
    const nextIndex = currentIndex + direction

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= siblings.length) {
      return
    }

    const nextCategories = [...siblings]
    const [nextMovingCategory] = nextCategories.splice(currentIndex, 1)
    nextCategories.splice(nextIndex, 0, nextMovingCategory)
    setIsMutating(true)

    try {
      await updateCategoriesOrder(requireUserId(), nextCategories)
    } catch (categoryError) {
      setError(
        categoryError instanceof Error
          ? categoryError.message
          : 'Failed to reorder categories.',
      )
      throw categoryError
    } finally {
      setIsMutating(false)
    }
  }

  async function moveTask(taskId: string, direction: -1 | 1, orderedTasks: Task[]) {
    const currentIndex = orderedTasks.findIndex((task) => task.id === taskId)
    const nextIndex = currentIndex + direction

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedTasks.length) {
      return
    }

    const nextTasks = [...orderedTasks]
    const [nextMovingTask] = nextTasks.splice(currentIndex, 1)
    nextTasks.splice(nextIndex, 0, nextMovingTask)
    setIsMutating(true)
    setSyncMessage('Reordering tasks...')

    try {
      await updateTasksOrder(requireUserId(), nextTasks)
      setSyncMessage('Updated. Waiting for realtime update...')
    } catch (taskError) {
      setError(
        taskError instanceof Error ? taskError.message : 'Failed to reorder tasks.',
      )
      setSyncMessage('Update failed.')
      throw taskError
    } finally {
      setIsMutating(false)
    }
  }

  async function setTaskStatus(taskId: string, status: TaskStatus) {
    const currentTask = tasks.find((task) => task.id === taskId)
    setIsMutating(true)
    setSyncMessage('Updating Realtime DB...')

    try {
      const currentUserId = requireUserId()
      const shouldCountCompletion =
        status === 'done' &&
        currentTask?.status !== 'done' &&
        Boolean(currentTask?.recurringTaskId) &&
        !currentTask?.completedAt
      const shouldSetCompletedAt = status === 'done' && currentTask?.status !== 'done'
      const shouldClearCompletedAt = status !== 'done' && currentTask?.status === 'done'

      await Promise.all([
        updateTask(currentUserId, taskId, {
          status,
          ...(shouldSetCompletedAt ? { completedAt: { '.sv': 'timestamp' } } : {}),
          ...(shouldClearCompletedAt ? { completedAt: null } : {}),
        }),
        shouldCountCompletion && currentTask?.recurringTaskId
          ? incrementRecurringTaskCompletedCount(currentUserId, currentTask.recurringTaskId)
          : Promise.resolve(),
      ])
      setSyncMessage('Updated. Waiting for realtime update...')
    } catch (taskError) {
      setError(
        taskError instanceof Error ? taskError.message : 'Failed to update task.',
      )
      setSyncMessage('Update failed.')
      throw taskError
    } finally {
      setIsMutating(false)
    }
  }

  async function editTask(
    taskId: string,
    title: string,
    description: string,
    dueDate: string | null,
    categoryId: string | null,
    recurringScheduleType: RecurringScheduleType | null = null,
    recurringIntervalDays: number | null = null,
  ) {
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    if (!trimmedTitle) {
      return
    }

    setIsMutating(true)
    setSyncMessage('Updating Realtime DB...')

    try {
      const currentUserId = requireUserId()
      const currentTask = tasks.find((task) => task.id === taskId)
      const nextDueDate = dueDate || getTodayString()
      const nextTaskInput = {
        description: trimmedDescription,
        dueDate,
        categoryId,
        title: trimmedTitle,
      }

      if (recurringScheduleType) {
        const intervalDays =
          recurringScheduleType === 'interval'
            ? Math.max(1, recurringIntervalDays ?? 1)
            : null

        if (currentTask?.recurringTaskId) {
          await Promise.all([
            updateRecurringTask(currentUserId, currentTask.recurringTaskId, {
              categoryId,
              description: trimmedDescription,
              intervalDays,
              nextDueDate: getNextRecurringDateForSchedule(
                recurringScheduleType,
                intervalDays,
                nextDueDate,
              ),
              scheduleType: recurringScheduleType,
              startDate: currentTask.recurringOccurrenceKey ?? nextDueDate,
              title: trimmedTitle,
            }),
            updateTask(currentUserId, taskId, {
              ...nextTaskInput,
              recurringOccurrenceKey: currentTask.recurringOccurrenceKey ?? nextDueDate,
            }),
          ])
        } else {
          const recurringTaskId = await createRecurringTask(currentUserId, {
            categoryId,
            description: trimmedDescription,
            intervalDays,
            nextDueDate: getNextRecurringDateForSchedule(
              recurringScheduleType,
              intervalDays,
              nextDueDate,
            ),
            scheduleType: recurringScheduleType,
            startDate: nextDueDate,
            title: trimmedTitle,
          })

          await updateTask(currentUserId, taskId, {
            ...nextTaskInput,
            recurringOccurrenceKey: nextDueDate,
            recurringTaskId,
          })
        }
      } else {
        await updateTask(currentUserId, taskId, nextTaskInput)
      }

      setSyncMessage('Updated. Waiting for realtime update...')
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Failed to update task.')
      setSyncMessage('Update failed.')
      throw taskError
    } finally {
      setIsMutating(false)
    }
  }

  async function removeTask(taskId: string) {
    setIsMutating(true)
    setSyncMessage('Deleting from Realtime DB...')

    try {
      await deleteTask(requireUserId(), taskId)
      setSyncMessage('Deleted. Waiting for realtime update...')
    } catch (taskError) {
      setError(
        taskError instanceof Error ? taskError.message : 'Failed to delete task.',
      )
      setSyncMessage('Delete failed.')
      throw taskError
    } finally {
      setIsMutating(false)
    }
  }

  async function removeCategory(categoryId: string) {
    setIsMutating(true)

    try {
      const currentUserId = requireUserId()
      const categoryIdsToRemove = new Set<string>([categoryId])
      let didAddCategory = true

      while (didAddCategory) {
        didAddCategory = false
        categories.forEach((category) => {
          if (category.parentId && categoryIdsToRemove.has(category.parentId)) {
            const previousSize = categoryIdsToRemove.size
            categoryIdsToRemove.add(category.id)
            didAddCategory = categoryIdsToRemove.size > previousSize
          }
        })
      }

      const affectedTasks = tasks.filter((task) => {
        return task.categoryId ? categoryIdsToRemove.has(task.categoryId) : false
      })

      await Promise.all([
        ...affectedTasks.map((task) =>
          updateTask(currentUserId, task.id, { categoryId: null }),
        ),
        ...Array.from(categoryIdsToRemove).map((nextCategoryId) =>
          deleteCategory(currentUserId, nextCategoryId),
        ),
      ])
    } catch (categoryError) {
      setError(
        categoryError instanceof Error
          ? categoryError.message
          : 'Failed to delete category.',
      )
      throw categoryError
    } finally {
      setIsMutating(false)
    }
  }

  return {
    categories,
    recurringTasks,
    tasks,
    isLoading,
    isMutating,
    error,
    syncMessage,
    addCategory,
    addRecurringTask,
    addTask,
    editTask,
    moveCategory,
    moveTask,
    renameCategory,
    removeCategory,
    removeRecurringTask,
    setTaskStatus,
    toggleRecurringTask,
    removeTask,
  }
}
