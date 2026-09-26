import { TaskComposer } from './components/TaskComposer'
import { TaskList } from './components/TaskList'
import { useTasks } from './hooks/useTasks'

export function DoListApp() {
  const {
    tasks,
    isLoading,
    isMutating,
    error,
    syncMessage,
    addTask,
    editTask,
    removeTask,
    setTaskStatus,
  } = useTasks()

  return (
    <section className="sub-app">
      <header className="sub-app-header">
        <div>
          <h2>Do List</h2>
          <p>Tasks are saved to Realtime Database and read back on launch.</p>
        </div>
        <span className="sync-pill">{syncMessage}</span>
      </header>

      {error ? <p className="app-error">{error}</p> : null}
      {isLoading ? <p className="app-muted">Loading tasks...</p> : null}

      {!isLoading && !error ? (
        <>
          <TaskComposer isBusy={isMutating} onAddTask={addTask} />
          <TaskList
            isBusy={isMutating}
            onDeleteTask={removeTask}
            onEditTask={editTask}
            onUpdateStatus={setTaskStatus}
            tasks={tasks}
          />
        </>
      ) : null}
    </section>
  )
}
