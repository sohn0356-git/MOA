import {
  increment,
  off,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
  type DataSnapshot,
} from 'firebase/database'
import { getRealtimeDb } from '../../../services/firebase'
import type {
  CreateRecurringTaskInput,
  CreateTaskInput,
  RecurringScheduleType,
  RecurringTask,
  Task,
  TaskCategory,
  TaskStatus,
  UpdateRecurringTaskInput,
  UpdateTaskInput,
  UpdateCategoryInput,
} from '../types/task'

const CATEGORIES_PATH = 'categories'
const RECURRING_TASKS_PATH = 'recurringTasks'
const TASKS_PATH = 'tasks'
const RECURRING_SCHEDULE_TYPES: RecurringScheduleType[] = [
  'daily',
  'weekly',
  'monthly',
  'interval',
]
const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'blocked', 'done']

type StoredTask = {
  categoryId?: unknown
  completedAt?: unknown
  content?: unknown
  description?: unknown
  dueDate?: unknown
  recurringOccurrenceKey?: unknown
  recurringTaskId?: unknown
  status?: unknown
  title?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

type StoredRecurringTask = {
  categoryId?: unknown
  completedCount?: unknown
  description?: unknown
  intervalDays?: unknown
  isActive?: unknown
  lastGeneratedDate?: unknown
  nextDueDate?: unknown
  scheduleType?: unknown
  startDate?: unknown
  title?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

type StoredCategory = {
  name?: unknown
  order?: unknown
  parentId?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

function getUserPath(userId: string, childPath: string) {
  return `users/${userId}/${childPath}`
}

function getCategoriesRef(userId: string) {
  return ref(getRealtimeDb(), getUserPath(userId, CATEGORIES_PATH))
}

function getCategoryRef(userId: string, categoryId: string) {
  return ref(getRealtimeDb(), `${getUserPath(userId, CATEGORIES_PATH)}/${categoryId}`)
}

function getTasksRef(userId: string) {
  return ref(getRealtimeDb(), getUserPath(userId, TASKS_PATH))
}

function getTaskRef(userId: string, taskId: string) {
  return ref(getRealtimeDb(), `${getUserPath(userId, TASKS_PATH)}/${taskId}`)
}

function getRecurringTasksRef(userId: string) {
  return ref(getRealtimeDb(), getUserPath(userId, RECURRING_TASKS_PATH))
}

function getRecurringTaskRef(userId: string, recurringTaskId: string) {
  return ref(
    getRealtimeDb(),
    `${getUserPath(userId, RECURRING_TASKS_PATH)}/${recurringTaskId}`,
  )
}

function toTimestamp(value: unknown) {
  return typeof value === 'number' ? value : null
}

function toOrder(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toTaskStatus(value: unknown): TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus) ? (value as TaskStatus) : 'todo'
}

function toRecurringScheduleType(value: unknown): RecurringScheduleType {
  return RECURRING_SCHEDULE_TYPES.includes(value as RecurringScheduleType)
    ? (value as RecurringScheduleType)
    : 'daily'
}

function toDueDate(value: unknown) {
  return typeof value === 'string' && value ? value : null
}

function toCategoryId(value: unknown) {
  return typeof value === 'string' && value ? value : null
}

function mapTaskSnapshot(taskId: string, data: StoredTask): Task {
  const title = String(data.title ?? data.content ?? '')

  return {
    id: taskId,
    categoryId: toCategoryId(data.categoryId),
    completedAt: toTimestamp(data.completedAt),
    title,
    description: String(data.description ?? ''),
    content: title,
    dueDate: toDueDate(data.dueDate),
    recurringOccurrenceKey: toDueDate(data.recurringOccurrenceKey),
    recurringTaskId: toCategoryId(data.recurringTaskId),
    status: toTaskStatus(data.status),
    createdAt: toTimestamp(data.createdAt),
    updatedAt: toTimestamp(data.updatedAt),
  }
}

function mapRecurringTaskSnapshot(
  recurringTaskId: string,
  data: StoredRecurringTask,
): RecurringTask {
  const startDate = toDueDate(data.startDate) ?? new Date().toISOString().slice(0, 10)
  const nextDueDate = toDueDate(data.nextDueDate) ?? startDate

  return {
    id: recurringTaskId,
    categoryId: toCategoryId(data.categoryId),
    completedCount:
      typeof data.completedCount === 'number' && Number.isFinite(data.completedCount)
        ? data.completedCount
        : 0,
    description: String(data.description ?? ''),
    intervalDays:
      typeof data.intervalDays === 'number' && Number.isFinite(data.intervalDays)
        ? Math.max(1, Math.floor(data.intervalDays))
        : null,
    isActive: data.isActive !== false,
    lastGeneratedDate: toDueDate(data.lastGeneratedDate),
    nextDueDate,
    scheduleType: toRecurringScheduleType(data.scheduleType),
    startDate,
    title: String(data.title ?? ''),
    createdAt: toTimestamp(data.createdAt),
    updatedAt: toTimestamp(data.updatedAt),
  }
}

function mapCategorySnapshot(categoryId: string, data: StoredCategory): TaskCategory {
  const createdAt = toTimestamp(data.createdAt)

  return {
    id: categoryId,
    name: String(data.name ?? ''),
    order: toOrder(data.order) ?? createdAt ?? 0,
    parentId: toCategoryId(data.parentId),
    createdAt,
    updatedAt: toTimestamp(data.updatedAt),
  }
}

function mapTasks(snapshot: DataSnapshot) {
  const value = snapshot.val() as Record<string, StoredTask> | null

  if (!value) {
    return []
  }

  return Object.entries(value)
    .map(([taskId, data]) => mapTaskSnapshot(taskId, data))
    .sort((firstTask, secondTask) => {
      return (secondTask.createdAt ?? 0) - (firstTask.createdAt ?? 0)
    })
}

function mapCategories(snapshot: DataSnapshot) {
  const value = snapshot.val() as Record<string, StoredCategory> | null

  if (!value) {
    return []
  }

  return Object.entries(value)
    .map(([categoryId, data]) => mapCategorySnapshot(categoryId, data))
    .filter((category) => category.name.trim())
    .sort((firstCategory, secondCategory) => {
      if (firstCategory.parentId !== secondCategory.parentId) {
        return (firstCategory.parentId ?? '').localeCompare(secondCategory.parentId ?? '')
      }

      return firstCategory.order - secondCategory.order
    })
}

function mapRecurringTasks(snapshot: DataSnapshot) {
  const value = snapshot.val() as Record<string, StoredRecurringTask> | null

  if (!value) {
    return []
  }

  return Object.entries(value)
    .map(([recurringTaskId, data]) => mapRecurringTaskSnapshot(recurringTaskId, data))
    .filter((recurringTask) => recurringTask.title.trim() && recurringTask.nextDueDate)
    .sort((firstTask, secondTask) => {
      return firstTask.nextDueDate.localeCompare(secondTask.nextDueDate)
    })
}

export async function createTask({
  categoryId,
  description,
  dueDate,
  recurringOccurrenceKey = null,
  recurringTaskId = null,
  status,
  title,
  userId,
}: CreateTaskInput & { userId: string }) {
  const taskRef = push(getTasksRef(userId))

  return set(taskRef, {
    content: title,
    categoryId,
    completedAt: status === 'done' ? serverTimestamp() : null,
    description,
    dueDate,
    recurringOccurrenceKey,
    recurringTaskId,
    status,
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function createRecurringTask(
  userId: string,
  input: CreateRecurringTaskInput,
) {
  const recurringTaskRef = push(getRecurringTasksRef(userId))

  await set(recurringTaskRef, {
    ...input,
    completedCount: 0,
    isActive: true,
    lastGeneratedDate: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return recurringTaskRef.key
}

export async function updateRecurringTask(
  userId: string,
  recurringTaskId: string,
  input: UpdateRecurringTaskInput,
) {
  return update(getRecurringTaskRef(userId, recurringTaskId), {
    ...input,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteRecurringTask(userId: string, recurringTaskId: string) {
  return remove(getRecurringTaskRef(userId, recurringTaskId))
}

export function incrementRecurringTaskCompletedCount(
  userId: string,
  recurringTaskId: string,
) {
  return updateRecurringTask(userId, recurringTaskId, {
    completedCount: increment(1),
  })
}

export async function createCategory(
  userId: string,
  name: string,
  order: number,
  parentId: string | null,
) {
  const categoryRef = push(getCategoriesRef(userId))

  return set(categoryRef, {
    name,
    order,
    parentId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput,
) {
  return update(getCategoryRef(userId, categoryId), {
    ...input,
    updatedAt: serverTimestamp(),
  })
}

export async function updateCategoriesOrder(userId: string, categories: TaskCategory[]) {
  const updates = categories.reduce<Record<string, number>>((nextUpdates, category, index) => {
    nextUpdates[`${getUserPath(userId, CATEGORIES_PATH)}/${category.id}/order`] = index
    return nextUpdates
  }, {})

  return update(ref(getRealtimeDb()), updates)
}

export async function deleteCategory(userId: string, categoryId: string) {
  return remove(getCategoryRef(userId, categoryId))
}

export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput) {
  const nextInput = {
    ...input,
    ...(input.title ? { content: input.title } : {}),
  }

  return update(getTaskRef(userId, taskId), {
    ...nextInput,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteTask(userId: string, taskId: string) {
  return remove(getTaskRef(userId, taskId))
}

export function subscribeToTasks(
  userId: string,
  onNext: (tasks: Task[]) => void,
  onError: (error: Error) => void,
) {
  const tasksQuery = query(getTasksRef(userId), orderByChild('createdAt'))

  onValue(tasksQuery, (snapshot) => onNext(mapTasks(snapshot)), onError)

  return () => off(tasksQuery)
}

export function subscribeToCategories(
  userId: string,
  onNext: (categories: TaskCategory[]) => void,
  onError: (error: Error) => void,
) {
  const categoriesQuery = query(getCategoriesRef(userId), orderByChild('order'))

  onValue(categoriesQuery, (snapshot) => onNext(mapCategories(snapshot)), onError)

  return () => off(categoriesQuery)
}

export function subscribeToRecurringTasks(
  userId: string,
  onNext: (recurringTasks: RecurringTask[]) => void,
  onError: (error: Error) => void,
) {
  const recurringTasksQuery = query(getRecurringTasksRef(userId), orderByChild('nextDueDate'))

  onValue(recurringTasksQuery, (snapshot) => onNext(mapRecurringTasks(snapshot)), onError)

  return () => off(recurringTasksQuery)
}
