export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done'

export type Task = {
  id: string
  title: string
  description: string
  content: string
  dueDate: string | null
  status: TaskStatus
  createdAt: number | null
  updatedAt: number | null
}

export type CreateTaskInput = {
  description: string
  dueDate: string | null
  status: TaskStatus
  title: string
}

export type UpdateTaskInput = {
  content?: string
  description?: string
  dueDate?: string | null
  status?: TaskStatus
  title?: string
}
