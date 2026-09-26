import { useEffect, useMemo, useState } from 'react'
import { getFirebaseConfigError } from '../../../services/firebase'
import {
  createTask,
  deleteTask,
  subscribeToTasks,
  updateTask,
} from '../services/taskService'
import type { Task, TaskStatus } from '../types/task'

export function useTasks() {
  const configError = useMemo(() => getFirebaseConfigError(), [])
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

    const unsubscribe = subscribeToTasks(
      (nextTasks) => {
        setTasks(nextTasks)
        setIsLoading(false)
        setError(null)
        setSyncMessage('Synced with Realtime DB.')
      },
      (snapshotError) => {
        setError(snapshotError.message)
        setIsLoading(false)
        setSyncMessage('Realtime DB sync failed.')
      },
    )

    return unsubscribe
  }, [configError])

  async function addTask(title: string, description: string, status: TaskStatus) {
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    if (!trimmedTitle) {
      return
    }

    setIsMutating(true)
    setSyncMessage('Saving to Realtime DB...')

    try {
      await createTask({
        description: trimmedDescription,
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

  async function editTask(taskId: string, title: string, description: string) {
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

  return {
    tasks,
    isLoading,
    isMutating,
    error,
    syncMessage,
    addTask,
    editTask,
    setTaskStatus,
    removeTask,
  }
}
