export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done'

export type Task = {
  id: string
  title: string
  description: string
  content: string
  status: TaskStatus
  createdAt: number | null
  updatedAt: number | null
}

export type CreateTaskInput = {
  description: string
  status: TaskStatus
  title: string
}

export type UpdateTaskInput = {
  content?: string
  description?: string
  status?: TaskStatus
  title?: string
}
