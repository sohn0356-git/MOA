import { TaskComposer } from './components/TaskComposer'
import { TaskList } from './components/TaskList'
import { useTasks } from './hooks/useTasks'

export function DoListApp() {
  const { tasks, isLoading, error, addTask, removeTask, setTaskStatus } = useTasks()

  return (
    <section className="sub-app">
      <header className="sub-app-header">
        <div>
          <h2>Do List</h2>
          <p>Realtime tasks synced with Cloud Firestore.</p>
        </div>
      </header>

      {error ? <p className="app-error">{error}</p> : null}
      {isLoading ? <p className="app-muted">Loading tasks...</p> : null}

      {!isLoading && !error ? (
        <>
          <TaskComposer onAddTask={addTask} />
          <TaskList
            onDeleteTask={removeTask}
            onUpdateStatus={setTaskStatus}
            tasks={tasks}
          />
        </>
      ) : null}
    </section>
  )
}
