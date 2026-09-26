import type { Timestamp } from 'firebase/firestore'

export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done'

export type Task = {
  id: string
  content: string
  status: TaskStatus
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type CreateTaskInput = {
  content: string
}

export type UpdateTaskInput = {
  content?: string
  status?: TaskStatus
}
