export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done'

export type RecurringScheduleType = 'daily' | 'weekly' | 'monthly' | 'interval'

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
  completedAt: number | null
  order: number
  title: string
  description: string
  content: string
  dueDate: string | null
  recurringOccurrenceKey: string | null
  recurringTaskId: string | null
  status: TaskStatus
  createdAt: number | null
  updatedAt: number | null
}

export type RecurringTask = {
  id: string
  categoryId: string | null
  completedCount: number
  description: string
  intervalDays: number | null
  isActive: boolean
  lastGeneratedDate: string | null
  nextDueDate: string
  scheduleType: RecurringScheduleType
  startDate: string
  title: string
  createdAt: number | null
  updatedAt: number | null
}

export type CreateTaskInput = {
  categoryId: string | null
  description: string
  dueDate: string | null
  recurringOccurrenceKey?: string | null
  recurringTaskId?: string | null
  status: TaskStatus
  title: string
}

export type UpdateTaskInput = {
  categoryId?: string | null
  completedAt?: number | object | null
  content?: string
  description?: string
  dueDate?: string | null
  order?: number
  recurringOccurrenceKey?: string | null
  recurringTaskId?: string | null
  status?: TaskStatus
  title?: string
}

export type UpdateCategoryInput = {
  name?: string
  order?: number
  parentId?: string | null
}

export type CreateRecurringTaskInput = {
  categoryId: string | null
  description: string
  intervalDays: number | null
  nextDueDate: string
  scheduleType: RecurringScheduleType
  startDate: string
  title: string
}

export type UpdateRecurringTaskInput = {
  categoryId?: string | null
  completedCount?: number | object
  description?: string
  intervalDays?: number | null
  isActive?: boolean
  lastGeneratedDate?: string | null
  nextDueDate?: string
  scheduleType?: RecurringScheduleType
  startDate?: string
  title?: string
}
