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
  createdAt?: unknown
}

function getCategoriesRef() {
  return ref(getRealtimeDb(), CATEGORIES_PATH)
}

function getCategoryRef(categoryId: string) {
  return ref(getRealtimeDb(), `${CATEGORIES_PATH}/${categoryId}`)
}

function getTasksRef() {
  return ref(getRealtimeDb(), TASKS_PATH)
}

function getTaskRef(taskId: string) {
  return ref(getRealtimeDb(), `${TASKS_PATH}/${taskId}`)
}

function toTimestamp(value: unknown) {
  return typeof value === 'number' ? value : null
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
  return {
    id: categoryId,
    name: String(data.name ?? ''),
    createdAt: toTimestamp(data.createdAt),
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
      return (firstCategory.createdAt ?? 0) - (secondCategory.createdAt ?? 0)
    })
}

export async function createTask({
  categoryId,
  description,
  dueDate,
  status,
  title,
}: CreateTaskInput) {
  const taskRef = push(getTasksRef())

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

export async function createCategory(name: string) {
  const categoryRef = push(getCategoriesRef())

  return set(categoryRef, {
    name,
    createdAt: serverTimestamp(),
  })
}

export async function deleteCategory(categoryId: string) {
  return remove(getCategoryRef(categoryId))
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  const nextInput = {
    ...input,
    ...(input.title ? { content: input.title } : {}),
  }

  return update(getTaskRef(taskId), {
    ...nextInput,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteTask(taskId: string) {
  return remove(getTaskRef(taskId))
}

export function subscribeToTasks(
  onNext: (tasks: Task[]) => void,
  onError: (error: Error) => void,
) {
  const tasksQuery = query(getTasksRef(), orderByChild('createdAt'))

  onValue(tasksQuery, (snapshot) => onNext(mapTasks(snapshot)), onError)

  return () => off(tasksQuery)
}

export function subscribeToCategories(
  onNext: (categories: TaskCategory[]) => void,
  onError: (error: Error) => void,
) {
  const categoriesQuery = query(getCategoriesRef(), orderByChild('createdAt'))

  onValue(categoriesQuery, (snapshot) => onNext(mapCategories(snapshot)), onError)

  return () => off(categoriesQuery)
}
