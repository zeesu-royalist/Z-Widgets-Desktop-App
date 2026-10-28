import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Check, X, Plus, Trash2, Pencil, GripVertical } from 'lucide-react'
import { TodoItem } from '../../../shared/types'

interface TodoListWidgetProps {
  widgetId: string
  onClose?: () => Promise<void>
}

// 4 Flower wallpapers bundled via standard ESM asset URLs
const FLOWER_IMAGES = [
  new URL('../assets/flowers/flower1.jpg', import.meta.url).href,
  new URL('../assets/flowers/flower2.jpg', import.meta.url).href,
  new URL('../assets/flowers/flower3.jpg', import.meta.url).href,
  new URL('../assets/flowers/flower4.jpg', import.meta.url).href
]

const DEFAULT_TODOS: TodoItem[] = [
  { id: 'todo-1', text: 'Design a new shot.', completed: true, createdAt: Date.now() - 3600000 },
  { id: 'todo-2', text: 'Make a twitter post.', completed: true, createdAt: Date.now() - 2700000 },
  { id: 'todo-3', text: 'Finish UI updates on the web.', completed: false, createdAt: Date.now() - 1800000 },
  { id: 'todo-4', text: 'Coffee Time 😊', completed: true, createdAt: Date.now() - 900000 },
  { id: 'todo-5', text: 'Meeting with stakeholders', completed: false, createdAt: Date.now() }
]

export const TodoListWidget: React.FC<TodoListWidgetProps> = ({ widgetId, onClose }) => {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [inputText, setInputText] = useState('')
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [bgIndex, setBgIndex] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const addInputRef = useRef<HTMLInputElement | null>(null)

  // 7-second rotating wallpaper slideshow
  useEffect(() => {
    const timer = setInterval(() => setBgIndex((i) => (i + 1) % FLOWER_IMAGES.length), 7000)
    return () => clearInterval(timer)
  }, [])

  // Live clock timer
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dateStr = useMemo(() => {
    return now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }, [now])

  const timeStr = useMemo(() => {
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }, [now])

  // Initial load
  useEffect(() => {
    window.api?.getTodos?.(widgetId).then((saved) => {
      if (!saved || saved.length === 0) {
        setTodos(DEFAULT_TODOS)
        window.api?.saveTodos?.(widgetId, DEFAULT_TODOS).catch(() => {})
      } else {
        setTodos(saved)
        setSaveStatus('saved')
      }
    }).catch(() => {})
  }, [widgetId])

  // Persistence handler
  const persistTodos = useCallback(async (items: TodoItem[]) => {
    setSaveStatus('saving')
    try {
      const ok = await window.api?.saveTodos?.(widgetId, items)
      setSaveStatus(ok ? 'saved' : 'error')
    } catch {
      setSaveStatus('error')
    }
  }, [widgetId])

  const updateTodos = (next: TodoItem[]): void => {
    setTodos(next)
    persistTodos(next)
  }

  // Task Actions
  const handleAddTask = (e?: React.FormEvent): void => {
    e?.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed) return
    updateTodos([...todos, { id: `task-${Date.now()}`, text: trimmed, completed: false, createdAt: Date.now() }])
    setInputText('')
    setIsAddingTask(false)
  }

  const handleToggle = (id: string): void => {
    updateTodos(todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  const handleDelete = (id: string): void => {
    updateTodos(todos.filter((t) => t.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const startEdit = (task: TodoItem): void => {
    setEditingId(task.id)
    setEditText(task.text)
  }

  const handleSaveEdit = (id: string): void => {
    const trimmed = editText.trim()
    if (trimmed) {
      updateTodos(todos.map((t) => (t.id === id ? { ...t, text: trimmed } : t)))
    }
    setEditingId(null)
  }

  // Drag and drop reordering
  const handleDrop = (targetIdx: number): void => {
    if (draggedIdx === null || draggedIdx === targetIdx) {
      setDraggedIdx(null)
      setDragOverIdx(null)
      return
    }
    const updated = [...todos]
    const [moved] = updated.splice(draggedIdx, 1)
    updated.splice(targetIdx, 0, moved)
    updateTodos(updated)
    setDraggedIdx(null)
    setDragOverIdx(null)
  }

  const handleClose = async (): Promise<void> => {
    if (onClose) return onClose()
    try {
      await (window.api?.closeSelf?.() ?? window.api?.closeWidget?.(widgetId))
    } catch {
      window.api?.closeWidget?.(widgetId)
    }
  }

  const completedCount = useMemo(() => todos.filter((t) => t.completed).length, [todos])

  return (
    <div className="w-screen h-screen flex bg-transparent select-none overflow-hidden font-sans">
      {/* Outer Shell: Green flower wallpaper background with bezel */}
      <div className="titlebar-drag-region w-full h-full rounded-[28px] p-2 flex flex-col justify-between relative group overflow-hidden border border-black/40 text-white select-none bg-[#7a9d7c]">

        {/* 7-Second Rotating Flower Slideshow */}
        {FLOWER_IMAGES.map((imgSrc, idx) => (
          <img
            key={imgSrc}
            src={imgSrc}
            alt="Flower wallpaper"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out pointer-events-none select-none ${
              idx === bgIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}

        {/* Contrast Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/55 pointer-events-none" />

        {/* Header Row: Live Date (Left) and Time Capsule with Close button (Right) */}
        <div className="titlebar-drag-region w-full px-2 pt-1 pb-2 flex items-center justify-between z-10 shrink-0">
          <span className="text-[12px] font-semibold text-white/95 tracking-tight drop-shadow-md">
            {dateStr}
          </span>

          <div className="titlebar-no-drag flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClose}
              title="Close widget"
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-white/70 hover:text-white hover:bg-black/25 transition-all cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>

            <div className="bg-white/25 backdrop-blur-md px-3 py-0.5 rounded-full text-white text-[12px] font-mono font-semibold border border-white/30 shadow-sm drop-shadow-md">
              {timeStr}
            </div>
          </div>
        </div>

        {/* Floating Card: Things to do Today */}
        <div className="titlebar-no-drag w-full flex-1 bg-[#19191b] rounded-[22px] p-3.5 flex flex-col justify-between shadow-[0_10px_28px_rgba(0,0,0,0.5)] border border-white/[0.08] relative z-10 overflow-hidden min-h-0">
          <div className="flex items-center justify-between pb-1 shrink-0">
            <h1 className="text-[15px] font-bold text-white tracking-tight">Things to do Today</h1>
            {saveStatus === 'saving' && (
              <span className="text-[10px] text-emerald-400 font-mono animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Saving
              </span>
            )}
          </div>

          {/* Tasks List with Drag & Drop Reordering */}
          <div className="titlebar-no-drag flex-1 overflow-y-auto space-y-1.5 py-1.5 no-scrollbar pr-0.5 min-h-0">
            {todos.length > 0 ? (
              todos.map((task, idx) => (
                <div
                  key={task.id}
                  draggable={editingId !== task.id}
                  onDragStart={(e) => {
                    setDraggedIdx(idx)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', String(idx))
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragOverIdx !== idx) setDragOverIdx(idx)
                  }}
                  onDragEnd={() => {
                    setDraggedIdx(null)
                    setDragOverIdx(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleDrop(idx)
                  }}
                  className={`group/task flex items-center justify-between gap-1.5 py-1 px-1 rounded-lg transition-all ${
                    draggedIdx === idx ? 'opacity-30 scale-[0.98]' : 'opacity-100'
                  } ${
                    dragOverIdx === idx && draggedIdx !== idx
                      ? 'border-t-2 border-emerald-400 bg-white/[0.04]'
                      : 'border-t-2 border-transparent'
                  }`}
                >
                  {/* Drag Handle Grip */}
                  <div
                    title="Drag to reorder"
                    className="text-neutral-500 hover:text-neutral-300 cursor-grab active:cursor-grabbing p-0.5 shrink-0 opacity-20 group-hover/task:opacity-90 transition-opacity"
                  >
                    <GripVertical className="h-3 w-3" />
                  </div>

                  {editingId === task.id ? (
                    /* Inline Edit Mode */
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSaveEdit(task.id)
                      }}
                      className="flex items-center gap-1.5 flex-1 min-w-0"
                    >
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                        autoFocus
                        maxLength={200}
                        className="flex-1 bg-white/[0.08] text-[13px] text-white border border-emerald-400/50 rounded px-2 py-0.5 outline-none select-text"
                      />
                      <button
                        type="submit"
                        title="Save edit"
                        className="p-1 rounded bg-emerald-400 text-neutral-950 hover:bg-emerald-300 transition-all cursor-pointer shrink-0"
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        title="Cancel"
                        className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </form>
                  ) : (
                    /* Normal Display Mode */
                    <>
                      <div
                        onClick={() => handleToggle(task.id)}
                        onDoubleClick={() => startEdit(task)}
                        title="Click to toggle, double-click to edit"
                        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none"
                      >
                        <div
                          className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0 transition-all ${
                            task.completed ? 'bg-white text-neutral-950 shadow-xs' : 'border border-white/30 hover:border-white/60 bg-transparent'
                          }`}
                        >
                          {task.completed && <Check className="h-3 w-3 text-neutral-950 stroke-[3.5]" />}
                        </div>
                        <span
                          className={`text-[13px] truncate leading-tight transition-all select-text ${
                            task.completed ? 'text-neutral-400 line-through' : 'text-neutral-100 font-normal'
                          }`}
                        >
                          {task.text}
                        </span>
                      </div>

                      {/* Action buttons on hover: Edit & Delete */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(task)}
                          title="Edit task"
                          className="opacity-0 group-hover/task:opacity-100 p-1 rounded-md text-neutral-400 hover:text-emerald-400 hover:bg-white/10 transition-all cursor-pointer"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(task.id)}
                          title="Delete task"
                          className="opacity-0 group-hover/task:opacity-100 p-1 rounded-md text-neutral-400 hover:text-rose-400 hover:bg-white/10 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-3 text-neutral-400 space-y-1">
                <span className="text-xs">No tasks yet</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTask(true)
                    setTimeout(() => addInputRef.current?.focus(), 50)
                  }}
                  className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                >
                  + Add a new task
                </button>
              </div>
            )}
          </div>

          {/* Bottom Action / Add Task Form */}
          {isAddingTask ? (
            <form onSubmit={handleAddTask} className="titlebar-no-drag mt-2 flex items-center gap-1.5 bg-white/[0.08] border border-white/15 rounded-xl px-2.5 py-1.5 transition-all shrink-0">
              <input
                ref={addInputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a task & press Enter..."
                maxLength={200}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-neutral-400 outline-none select-text"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="bg-emerald-400 hover:bg-emerald-300 disabled:opacity-30 text-neutral-950 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg transition-all cursor-pointer shadow-xs"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="text-[11px] text-neutral-400 hover:text-white px-1.5 cursor-pointer"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="titlebar-drag-region flex items-center justify-between pt-2 border-t border-white/[0.06] shrink-0 mt-auto">
              <span className="font-mono text-[10px] text-neutral-400">
                {todos.length > 0 ? `${completedCount} of ${todos.length} completed` : '0 tasks'}
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsAddingTask(true)
                  setTimeout(() => addInputRef.current?.focus(), 50)
                }}
                className="titlebar-no-drag bg-[#28282c] hover:bg-[#34343a] active:scale-95 text-neutral-200 hover:text-white text-[11px] font-medium px-3.5 py-1.5 rounded-full border border-white/10 shadow-sm transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="h-3 w-3 text-neutral-300" />
                <span>Add Task</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
