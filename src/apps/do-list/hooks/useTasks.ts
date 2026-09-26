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
    configError ? 'Firebase is not configured.' : 'Connecting to Firestore...',
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
        setSyncMessage('Synced with Firestore.')
      },
      (snapshotError) => {
        setError(snapshotError.message)
        setIsLoading(false)
        setSyncMessage('Firestore sync failed.')
      },
    )

    return unsubscribe
  }, [configError])

  async function addTask(content: string) {
    const trimmedContent = content.trim()

    if (!trimmedContent) {
      return
    }

    setIsMutating(true)
    setSyncMessage('Saving to Firestore...')

    try {
      await createTask({ content: trimmedContent })
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
    setSyncMessage('Updating Firestore...')

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

  async function removeTask(taskId: string) {
    setIsMutating(true)
    setSyncMessage('Deleting from Firestore...')

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
    setTaskStatus,
    removeTask,
  }
}
