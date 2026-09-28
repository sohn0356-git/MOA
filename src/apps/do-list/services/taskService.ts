import {
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
  CreateTaskInput,
  Task,
  TaskCategory,
  TaskStatus,
  UpdateTaskInput,
  UpdateCategoryInput,
} from '../types/task'

const CATEGORIES_PATH = 'categories'
const TASKS_PATH = 'tasks'
const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'blocked', 'done']

type StoredTask = {
  categoryId?: unknown
  content?: unknown
  description?: unknown
  dueDate?: unknown
  status?: unknown
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

function toTimestamp(value: unknown) {
  return typeof value === 'number' ? value : null
}

function toOrder(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toTaskStatus(value: unknown): TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus) ? (value as TaskStatus) : 'todo'
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
    title,
    description: String(data.description ?? ''),
    content: title,
    dueDate: toDueDate(data.dueDate),
    status: toTaskStatus(data.status),
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

export async function createTask({
  categoryId,
  description,
  dueDate,
  status,
  title,
  userId,
}: CreateTaskInput & { userId: string }) {
  const taskRef = push(getTasksRef(userId))

  return set(taskRef, {
    content: title,
    categoryId,
    description,
    dueDate,
    status,
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
