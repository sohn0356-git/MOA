export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done'

export type Task = {
  id: string
  content: string
  status: TaskStatus
  createdAt: number | null
  updatedAt: number | null
}

export type CreateTaskInput = {
  content: string
}

export type UpdateTaskInput = {
  content?: string
  status?: TaskStatus
}
