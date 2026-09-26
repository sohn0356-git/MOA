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

  useEffect(() => {
    if (configError) {
      return undefined
    }

    const unsubscribe = subscribeToTasks(
      (nextTasks) => {
        setTasks(nextTasks)
        setIsLoading(false)
        setError(null)
      },
      (snapshotError) => {
        setError(snapshotError.message)
        setIsLoading(false)
      },
    )

    return unsubscribe
  }, [configError])

  async function addTask(content: string) {
    const trimmedContent = content.trim()

    if (!trimmedContent) {
      return
    }

    await createTask({ content: trimmedContent })
  }

  async function setTaskStatus(taskId: string, status: TaskStatus) {
    await updateTask(taskId, { status })
  }

  async function removeTask(taskId: string) {
    await deleteTask(taskId)
  }

  return {
    tasks,
    isLoading,
    error,
    addTask,
    setTaskStatus,
    removeTask,
  }
}
