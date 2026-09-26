import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore'
import { getFirestoreDb } from '../../../services/firebase'
import type {
  CreateTaskInput,
  Task,
  TaskStatus,
  UpdateTaskInput,
} from '../types/task'

const TASKS_COLLECTION = 'tasks'
const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'blocked', 'done']

function getTasksCollection() {
  return collection(getFirestoreDb(), TASKS_COLLECTION)
}

export async function createTask({ content }: CreateTaskInput) {
  return addDoc(getTasksCollection(), {
    content,
    status: 'todo',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  return updateDoc(doc(getFirestoreDb(), TASKS_COLLECTION, taskId), {
    ...input,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteTask(taskId: string) {
  return deleteDoc(doc(getFirestoreDb(), TASKS_COLLECTION, taskId))
}

export function subscribeToTasks(
  onNext: (tasks: Task[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  const tasksQuery = query(getTasksCollection(), orderBy('createdAt', 'desc'))

  return onSnapshot(
    tasksQuery,
    (snapshot) => {
      onNext(
        snapshot.docs.map((taskDoc) => {
          const data = taskDoc.data()

          return {
            id: taskDoc.id,
            content: String(data.content ?? ''),
            status: TASK_STATUSES.includes(data.status) ? data.status : 'todo',
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
          } satisfies Task
        }),
      )
    },
    onError,
  )
}
