import { useEffect, useMemo, useState } from 'react'
import { getFirebaseConfigError } from '../../../services/firebase'
import {
  createCategory,
  createTask,
  deleteCategory,
  deleteTask,
  subscribeToCategories,
  subscribeToTasks,
  updateTask,
} from '../services/taskService'
import type { Task, TaskCategory, TaskStatus } from '../types/task'

export function useTasks() {
  const configError = useMemo(() => getFirebaseConfigError(), [])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(!configError)
  const [error, setError] = useState<string | null>(configError)
  const [isMutating, setIsMutating] = useState(false)
  const [syncMessage, setSyncMessage] = useState(
    configError ? 'Firebase is not configured.' : 'Connecting to Realtime DB...',
  )

  useEffect(() => {
    if (configError) {
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
  }, [configError])

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
      await createTask({
        categoryId,
        description: trimmedDescription,
        dueDate,
        status,
        title: trimmedTitle,
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

  async function addCategory(name: string) {
    const trimmedName = name.trim()

    if (!trimmedName) {
      return
    }

    setIsMutating(true)

    try {
      await createCategory(trimmedName)
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

  async function setTaskStatus(taskId: string, status: TaskStatus) {
    setIsMutating(true)
    setSyncMessage('Updating Realtime DB...')

    try {
      await updateTask(taskId, { status })
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
      await updateTask(taskId, {
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
      await deleteTask(taskId)
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
      const affectedTasks = tasks.filter((task) => task.categoryId === categoryId)

      await Promise.all([
        ...affectedTasks.map((task) => updateTask(task.id, { categoryId: null })),
        deleteCategory(categoryId),
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
    removeCategory,
    setTaskStatus,
    removeTask,
  }
}
