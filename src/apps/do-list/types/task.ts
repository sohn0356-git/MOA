export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done'

export type TaskCategory = {
  id: string
  name: string
  order: number
  parentId: string | null
  createdAt: number | null
  updatedAt: number | null
}

export type Task = {
  id: string
  categoryId: string | null
  title: string
  description: string
  content: string
  dueDate: string | null
  status: TaskStatus
  createdAt: number | null
  updatedAt: number | null
}

export type CreateTaskInput = {
  categoryId: string | null
  description: string
  dueDate: string | null
  status: TaskStatus
  title: string
}

export type UpdateTaskInput = {
  categoryId?: string | null
  content?: string
  description?: string
  dueDate?: string | null
  status?: TaskStatus
  title?: string
}

export type UpdateCategoryInput = {
  name?: string
  order?: number
  parentId?: string | null
}
