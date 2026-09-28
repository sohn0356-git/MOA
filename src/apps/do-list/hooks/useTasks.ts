import { useEffect, useMemo, useState } from 'react'
import { getFirebaseConfigError } from '../../../services/firebase'
import {
  createCategory,
  createTask,
  deleteCategory,
  deleteTask,
  subscribeToCategories,
  subscribeToTasks,
  updateCategoriesOrder,
  updateCategory,
  updateTask,
} from '../services/taskService'
import type { Task, TaskCategory, TaskStatus } from '../types/task'

export function useTasks(userId: string | null) {
  const configError = useMemo(() => getFirebaseConfigError(), [])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(!configError && Boolean(userId))
  const [error, setError] = useState<string | null>(configError)
  const [isMutating, setIsMutating] = useState(false)
  const [syncMessage, setSyncMessage] = useState(
    configError ? 'Firebase is not configured.' : 'Connecting to Realtime DB...',
  )

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

    let didLoadTasks = false
    let didLoadCategories = false

    function markLoaded(type: 'categories' | 'tasks') {
      if (type === 'tasks') {
        didLoadTasks = true
      } else {
        didLoadCategories = true
      }

      if (didLoadTasks && didLoadCategories) {
        setIsLoading(false)
      }
    }

    const unsubscribeTasks = subscribeToTasks(
      userId,
      (nextTasks) => {
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

    return () => {
      unsubscribeTasks()
      unsubscribeCategories()
    }
  }, [configError, userId])

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

  async function setTaskStatus(taskId: string, status: TaskStatus) {
    setIsMutating(true)
    setSyncMessage('Updating Realtime DB...')

    try {
      await updateTask(requireUserId(), taskId, { status })
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
  ) {
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    if (!trimmedTitle) {
      return
    }

    setIsMutating(true)
    setSyncMessage('Updating Realtime DB...')

    try {
      await updateTask(requireUserId(), taskId, {
        description: trimmedDescription,
        dueDate,
        categoryId,
        title: trimmedTitle,
      })
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
    tasks,
    isLoading,
    isMutating,
    error,
    syncMessage,
    addCategory,
    addTask,
    editTask,
    moveCategory,
    renameCategory,
    removeCategory,
    setTaskStatus,
    removeTask,
  }
}
