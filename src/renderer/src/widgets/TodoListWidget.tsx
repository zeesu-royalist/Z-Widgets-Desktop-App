import React, { useState, useEffect, useRef, useCallback } from 'react'
import { CheckSquare, Square, Check, X, Plus, Trash2, AlertCircle } from 'lucide-react'
import { TodoItem } from '../../../shared/types'

interface TodoListWidgetProps {
  widgetId: string
  onClose?: () => Promise<void>
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export const TodoListWidget: React.FC<TodoListWidgetProps> = ({ widgetId, onClose }) => {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [inputText, setInputText] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const latestTodosRef = useRef<TodoItem[]>([])
  latestTodosRef.current = todos

  useEffect(() => {
    let isMounted = true
    window.api?.getTodos?.(widgetId).then((saved) => {
      if (!isMounted) return
      const list = saved || []
      setTodos(list)
      latestTodosRef.current = list
      setIsLoaded(true)
      if (list.length > 0) setSaveStatus('saved')
    }).catch(() => { if (isMounted) setIsLoaded(true) })
    return () => { isMounted = false }
  }, [widgetId])

  const persistTodos = useCallback(async (items: TodoItem[]): Promise<boolean> => {
    setSaveStatus('saving')
    try {
      const ok = await window.api?.saveTodos?.(widgetId, items)
      setSaveStatus(ok ? 'saved' : 'error')
      return Boolean(ok)
    } catch {
      setSaveStatus('error')
      return false
    }
  }, [widgetId])

  const updateAndPersist = (next: TodoItem[]): void => {
    setTodos(next)
    latestTodosRef.current = next
    persistTodos(next)
  }

  const handleAddTask = (e?: React.FormEvent): void => {
    e?.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed) return
    updateAndPersist([{ id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: trimmed, completed: false, createdAt: Date.now() }, ...todos])
    setInputText('')
  }

  const handleToggleTask = (id: string): void => {
    updateAndPersist(todos.map((t) => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const handleDeleteTask = (id: string): void => {
    updateAndPersist(todos.filter((t) => t.id !== id))
  }

  const handleClose = async (): Promise<void> => {
    if (onClose) return onClose()
    try { await (window.api?.closeSelf?.() ?? window.api?.closeWidget?.(widgetId)) }
    catch { window.api?.closeWidget?.(widgetId) }
  }

  const completedCount = todos.filter((t) => t.completed).length

  return (
    <div className="w-screen h-screen p-2.5 flex items-center justify-center bg-transparent select-none overflow-hidden font-sans">
      <div className="w-full h-full glass-panel rounded-apple-xl p-4 flex flex-col justify-between shadow-glass-light dark:shadow-glass-dark border border-black/10 dark:border-white/10 relative group transition-all">
        {/* Top Header Row */}
        <div className="titlebar-drag-region flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06] z-10 cursor-move">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <div className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckSquare className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-800 dark:text-neutral-200">
              To-Do List
            </span>
          </div>

          <div className="titlebar-no-drag flex items-center gap-2.5">
            {saveStatus !== 'idle' && (
              <span className={`text-[10px] font-medium flex items-center gap-1 ${
                saveStatus === 'saving' ? 'text-amber-600 dark:text-amber-400 animate-pulse' :
                saveStatus === 'saved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
              }`}>
                {saveStatus === 'saving' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                {saveStatus === 'saved' && <Check className="h-3 w-3" />}
                {saveStatus === 'error' && <AlertCircle className="h-3 w-3" />}
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save error'}
              </span>
            )}

            <button
              onClick={handleClose}
              aria-label="Close to-do widget"
              title="Close widget (keeps tasks saved)"
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Task Input Field */}
        <form onSubmit={handleAddTask} className="titlebar-no-drag my-2 flex items-center gap-1.5">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isLoaded ? 'Add a new task...' : 'Loading tasks...'}
            disabled={!isLoaded}
            maxLength={200}
            className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-apple-sm px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none focus:border-blue-500/50 select-text cursor-text transition-all"
          />
          <button
            type="submit"
            disabled={!isLoaded || !inputText.trim()}
            title="Add task"
            className="inline-flex items-center justify-center p-1.5 rounded-apple-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* Scrollable Tasks List */}
        <div className="titlebar-no-drag flex-1 overflow-y-auto space-y-1 pr-0.5 select-text my-0.5 min-h-0">
          {todos.length > 0 ? (
            todos.map((task) => (
              <div
                key={task.id}
                className="group/task flex items-center gap-2 p-1.5 rounded-apple-sm bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.04] transition-all"
              >
                <button
                  type="button"
                  onClick={() => handleToggleTask(task.id)}
                  title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  className="p-0.5 rounded text-neutral-400 hover:text-emerald-500 transition-colors cursor-pointer shrink-0"
                >
                  {task.completed ? (
                    <div className="h-3.5 w-3.5 rounded bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  ) : (
                    <Square className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
                  )}
                </button>

                <span
                  className={`flex-1 text-xs break-words leading-relaxed select-text cursor-default ${
                    task.completed
                      ? 'line-through text-neutral-400 dark:text-neutral-500'
                      : 'text-neutral-800 dark:text-neutral-100'
                  }`}
                >
                  {task.text}
                </span>

                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  title="Delete task"
                  className="opacity-0 group-hover/task:opacity-100 p-1 rounded hover:bg-rose-500/10 text-neutral-400 hover:text-rose-500 transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-3 text-neutral-400 space-y-1">
              <span className="text-xs">No tasks yet</span>
              <span className="text-[10px] text-neutral-400/80">Add one above to get started</span>
            </div>
          )}
        </div>

        {/* Bottom Footer: Stats */}
        <div className="titlebar-drag-region flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 pt-1.5 border-t border-black/[0.04] dark:border-white/[0.04] z-10 cursor-move">
          <span className="font-mono">
            {todos.length > 0 ? `${completedCount} of ${todos.length} completed` : '0 tasks'}
          </span>
          <span className="font-mono text-neutral-400">
            Z-Widgets
          </span>
        </div>
      </div>
    </div>
  )
}
