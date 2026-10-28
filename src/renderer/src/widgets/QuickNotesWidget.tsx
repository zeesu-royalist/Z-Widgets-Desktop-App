import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  X,
  Check,
  AlertCircle,
  Plus,
  ChevronRight,
  ChevronLeft,
  Search,
  Trash2,
  FileText
} from 'lucide-react'

interface QuickNotesWidgetProps {
  widgetId: string
  onClose?: () => Promise<void>
}

interface NoteItem {
  id: string
  title: string
  subtitle?: string
  content: string
  updatedAt: number
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// Geometry Constants for Wheel-Scroll Carousel (Single Source of Truth)
const ITEM_H = 42
const STEP = 50 // 42px height + 8px gap
const VIEWPORT_H = 94
const PADDING_Y = 26

const getWordCount = (text: string): number =>
  text.trim() ? text.trim().split(/\s+/).length : 0

const DEFAULT_NOTES: NoteItem[] = [
  {
    id: 'note-1',
    title: 'Project Ideas',
    subtitle: '18 words • Just now',
    content:
      'Jot down a quick thought or note...\n\n- Add smooth widget transitions\n- Polish ergonomics\n- Continuous auto-save',
    updatedAt: Date.now()
  },
  {
    id: 'note-2',
    title: 'Meeting Notes',
    subtitle: '14 words • Today',
    content:
      'Team sync notes:\n- Review widget layouts\n- Polish desktop interactions and styling',
    updatedAt: Date.now() - 3600000
  },
  {
    id: 'note-3',
    title: 'Daily Checklist',
    subtitle: '22 words • Morning',
    content:
      '1. Standup review with team\n2. Ship new widget improvements\n3. Test scroll animations\n4. Verify tests pass',
    updatedAt: Date.now() - 7200000
  },
  {
    id: 'note-4',
    title: 'Design Inspirations',
    subtitle: '16 words • Yesterday',
    content:
      'Apple Watch wheel scroll carousel, clean matte dark panels, and smooth micro-interactions.',
    updatedAt: Date.now() - 86400000
  },
  {
    id: 'note-5',
    title: 'Quick Snippet',
    subtitle: '12 words • Oct 27',
    content:
      'Personal reminder:\nVerify atomic persistence and storage flushes.',
    updatedAt: Date.now() - 172800000
  }
]

export const QuickNotesWidget: React.FC<QuickNotesWidgetProps> = ({ widgetId, onClose }) => {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const [scrollTop, setScrollTop] = useState<number>(STEP)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestNotesRef = useRef<NoteItem[]>([])
  latestNotesRef.current = notes

  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  // 1. Initial Load from Persistent Store
  useEffect(() => {
    let isMounted = true
    window.api
      ?.getNoteContent?.(widgetId)
      .then((saved) => {
        if (!isMounted) return

        if (!saved) {
          setNotes(DEFAULT_NOTES)
          latestNotesRef.current = DEFAULT_NOTES
          window.api?.saveNoteContent?.(widgetId, JSON.stringify(DEFAULT_NOTES)).catch(() => {})
          setIsLoaded(true)
          return
        }

        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNotes(parsed)
            latestNotesRef.current = parsed
            setIsLoaded(true)
            setSaveStatus('saved')
            return
          }
        } catch {
          // Legacy plain text note handling
        }

        const lines = saved.split('\n').filter((l: string) => l.trim().length > 0)
        const legacyNote: NoteItem[] = [
          {
            id: 'note-legacy-1',
            title: (lines[0] || 'Quick Note').slice(0, 32),
            subtitle: `${getWordCount(saved)} words • Saved Note`,
            content: saved,
            updatedAt: Date.now()
          }
        ]
        setNotes(legacyNote)
        latestNotesRef.current = legacyNote
        setIsLoaded(true)
        setSaveStatus('saved')
      })
      .catch(() => {
        if (isMounted) setIsLoaded(true)
      })

    return () => {
      isMounted = false
    }
  }, [widgetId])

  // 2. Debounced Save to Storage
  const flushSave = useCallback(
    async (itemsToSave: NoteItem[]): Promise<boolean> => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      try {
        const ok = await window.api?.saveNoteContent?.(widgetId, JSON.stringify(itemsToSave))
        setSaveStatus(ok ? 'saved' : 'error')
        return Boolean(ok)
      } catch {
        setSaveStatus('error')
        return false
      }
    },
    [widgetId]
  )

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        window.api?.saveNoteContent?.(widgetId, JSON.stringify(latestNotesRef.current)).catch(() => {})
      }
    }
  }, [widgetId])

  const triggerSave = useCallback(
    (updated: NoteItem[]): void => {
      setNotes(updated)
      latestNotesRef.current = updated
      setSaveStatus('saving')
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => flushSave(updated), 350)
    },
    [flushSave]
  )

  // 3. User Actions
  const handleCreateNewNote = (): void => {
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title: 'New Note',
      subtitle: '0 words • Just now',
      content: '',
      updatedAt: Date.now()
    }
    const updated = [newNote, ...notes]
    triggerSave(updated)
    setActiveNoteId(newNote.id)
    setTimeout(() => {
      contentTextareaRef.current?.focus()
    }, 60)
  }

  const handleUpdateNoteContent = (newText: string): void => {
    if (!activeNoteId) return
    const lines = newText.split('\n').filter((l) => l.trim().length > 0)
    const wordCount = getWordCount(newText)
    const updated = notes.map((item) => {
      if (item.id !== activeNoteId) return item
      return {
        ...item,
        title: lines[0] ? lines[0].slice(0, 32) : 'Untitled Note',
        subtitle: `${wordCount} word${wordCount === 1 ? '' : 's'} • Just now`,
        content: newText,
        updatedAt: Date.now()
      }
    })
    triggerSave(updated)
  }

  const handleDeleteNote = (noteId: string): void => {
    const updated = notes.filter((n) => n.id !== noteId)
    triggerSave(updated)
    if (activeNoteId === noteId) {
      setActiveNoteId(null)
    }
  }

  const handleClose = async (): Promise<void> => {
    if (debounceTimerRef.current) {
      await flushSave(latestNotesRef.current)
    }
    if (onClose) return onClose()
    try {
      await (window.api?.closeSelf?.() ?? window.api?.closeWidget?.(widgetId))
    } catch {
      window.api?.closeWidget?.(widgetId)
    }
  }

  // 4. Memoized Filtered Notes (Zero re-filter cost on 60fps scroll events)
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes
    const q = searchQuery.toLowerCase()
    return notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
  }, [notes, searchQuery])

  // 5. Default 2nd Note Centering (Reliably centers index 1 on mount or list return)
  useEffect(() => {
    if (!activeNoteId && isLoaded && listRef.current && filteredNotes.length > 1) {
      const centerSecondNote = () => {
        if (listRef.current) {
          listRef.current.scrollTop = STEP
          setScrollTop(STEP)
        }
      }
      centerSecondNote()
      const raf = requestAnimationFrame(centerSecondNote)
      const timer = setTimeout(centerSecondNote, 40)
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(timer)
      }
    }
  }, [activeNoteId, isLoaded, filteredNotes.length])

  const activeNote = useMemo(() => notes.find((n) => n.id === activeNoteId), [notes, activeNoteId])
  const activeWordCount = useMemo(() => (activeNote?.content ? getWordCount(activeNote.content) : 0), [activeNote?.content])
  const activeCharCount = activeNote?.content?.length || 0

  return (
    <div className="w-screen h-screen flex bg-transparent select-none overflow-hidden font-sans">
      {/* Matte Dark Card Shell */}
      <div className="titlebar-drag-region w-full h-full bg-[#1e1e20] rounded-[26px] p-3 flex flex-col justify-between border border-white/10 relative group overflow-hidden shadow-none text-white">

        {/* Subtle Apple Maps Radar Rings in Dark Background */}
        <div className="absolute top-[65px] left-1/2 -translate-x-1/2 w-48 h-48 rounded-full border border-white/[0.035] pointer-events-none flex items-center justify-center">
          <div className="w-28 h-28 rounded-full border border-white/[0.04]" />
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: NOTES LIST VIEW (Matches Reference Image)                         */}
        {/* ========================================================================= */}
        {!activeNote ? (
          <div className="w-full h-full flex flex-col justify-between z-10">
            {/* Top Header Row */}
            <div className="flex items-center justify-between shrink-0">
              {/* Left Subtitle & Title */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                  <FileText className="h-3 w-3 text-amber-400" />
                  <span>Quick Notes</span>
                </div>
                <h1 className="text-[17px] font-bold text-white tracking-tight leading-tight mt-0.5">
                  All Notes
                </h1>
              </div>

              {/* Right: Window Controls (Hover-only X) & Golden Glowing Action Circle (Far Right) */}
              <div className="titlebar-no-drag flex items-center gap-2">
                <button
                  onClick={handleClose}
                  aria-label="Close widget"
                  title="Close widget"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={handleCreateNewNote}
                  title="Create new note"
                  aria-label="Create new note"
                  className="w-8 h-8 rounded-full bg-[#f8b825] hover:bg-[#ffc636] active:scale-95 flex items-center justify-center shadow-[0_0_14px_rgba(248,184,37,0.45)] hover:shadow-[0_0_18px_rgba(248,184,37,0.65)] transition-all cursor-pointer group/btn shrink-0"
                >
                  <Plus className="h-4 w-4 text-[#3d2700] stroke-[2.75] group-hover/btn:rotate-90 transition-transform duration-200" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="titlebar-no-drag my-1 flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.09] focus-within:bg-white/[0.12] focus-within:border-white/20 border border-white/5 rounded-xl px-2.5 h-[26px] shrink-0 transition-all">
              <Search className="h-3 w-3 text-neutral-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full bg-transparent text-[11px] text-white placeholder:text-neutral-500 outline-none select-text"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-neutral-400 hover:text-white px-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Smooth Animated Wheel-Scroll Cards (Centered item scale 1.0, others scale inward, ample horizontal breathing room) */}
            <div
              ref={listRef}
              onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
              style={{
                scrollSnapType: 'y mandatory',
                paddingTop: `${PADDING_Y}px`,
                paddingBottom: `${PADDING_Y}px`,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
              className="titlebar-no-drag flex-1 overflow-y-auto space-y-2 px-3 no-scrollbar h-[94px] scroll-smooth"
            >
              {filteredNotes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-2 text-neutral-400 text-xs">
                  <span>No notes found</span>
                  <button
                    onClick={handleCreateNewNote}
                    className="mt-1 text-amber-400 hover:underline text-[11px] cursor-pointer"
                  >
                    + Create a new note
                  </button>
                </div>
              ) : (
                filteredNotes.map((note, index) => {
                  const cardCenter = PADDING_Y + index * STEP + ITEM_H / 2
                  const viewportCenter = scrollTop + VIEWPORT_H / 2
                  const diff = cardCenter - viewportCenter
                  const distance = Math.abs(diff) / STEP

                  // Center note is scale 1.0 (never exceeds 1.0 to guarantee zero horizontal clipping)
                  const scale = Math.max(0.78, 1.0 - Math.min(2.0, distance) * 0.12)
                  const opacity = Math.max(0.35, 1.0 - Math.min(2.0, distance) * 0.35)
                  const zIndex = Math.round(Math.max(1, 10 - distance * 3))
                  const isCentered = distance < 0.35

                  return (
                    <div
                      key={note.id}
                      onClick={() => setActiveNoteId(note.id)}
                      style={{
                        transform: `scale(${scale.toFixed(3)})`,
                        opacity: opacity.toFixed(3),
                        zIndex,
                        scrollSnapAlign: 'center',
                        height: `${ITEM_H}px`
                      }}
                      className={`w-full bg-white text-neutral-900 rounded-[16px] px-3.5 py-1.5 flex items-center justify-between transition-all duration-150 ease-out origin-center cursor-pointer select-none ${
                        isCentered
                          ? 'shadow-[0_4px_16px_rgba(0,0,0,0.3)] ring-1 ring-white/30'
                          : 'shadow-xs hover:opacity-85'
                      }`}
                    >
                      {/* Note Content Left */}
                      <div className="flex flex-col truncate pr-2">
                        <span
                          className={`font-bold text-neutral-900 truncate tracking-tight transition-all ${
                            isCentered ? 'text-[13px]' : 'text-[12px]'
                          }`}
                        >
                          {note.title}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium tracking-tight mt-0.5 truncate">
                          {note.subtitle || `${getWordCount(note.content)} words`}
                        </span>
                      </div>

                      {/* Chevron Right */}
                      <ChevronRight
                        className={`transition-all shrink-0 ${
                          isCentered
                            ? 'h-4 w-4 text-neutral-700 translate-x-0.5'
                            : 'h-3.5 w-3.5 text-neutral-300'
                        }`}
                      />
                    </div>
                  )
                })
              )}
            </div>

            {/* Bottom Status / Count (Restored original style: {count} saved notes on left, Z-Widgets on right) */}
            <div className="titlebar-drag-region flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-white/[0.06] shrink-0">
              <span className="font-mono">
                {notes.length} saved note{notes.length === 1 ? '' : 's'}
              </span>
              <span className="font-mono text-neutral-400">Z-Widgets</span>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: NOTE WRITING & AUTO-SAVE EDITOR                                  */
          /* ========================================================================= */
          <div className="w-full h-full flex flex-col justify-between z-10">
            {/* Editor Header */}
            <div className="titlebar-no-drag flex items-center justify-between pb-1.5">
              <button
                onClick={() => setActiveNoteId(null)}
                className="flex items-center gap-1 text-[11px] font-semibold text-neutral-300 hover:text-white bg-white/10 hover:bg-white/15 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Notes</span>
              </button>

              <div className="flex items-center gap-2">
                {saveStatus !== 'idle' && (
                  <span
                    className={`text-[10px] font-medium flex items-center gap-1 ${
                      saveStatus === 'saving'
                        ? 'text-neutral-300 animate-pulse'
                        : saveStatus === 'saved'
                          ? 'text-neutral-300'
                          : 'text-rose-400'
                    }`}
                  >
                    {saveStatus === 'saving' && <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />}
                    {saveStatus === 'saved' && <Check className="h-2.5 w-2.5 stroke-[2.5]" />}
                    {saveStatus === 'error' && <AlertCircle className="h-2.5 w-2.5" />}
                    {saveStatus === 'saving' ? 'Saving' : saveStatus === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}

                <button
                  onClick={() => handleDeleteNote(activeNote.id)}
                  title="Delete this note"
                  className="p-1 rounded-full text-neutral-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Note Writing Card Container */}
            <div className="titlebar-no-drag flex-1 w-full bg-white text-neutral-900 rounded-[18px] p-3 flex flex-col justify-between shadow-md overflow-hidden">
              {/* Note Title Header */}
              <div className="pb-1 border-b border-black/[0.06]">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => {
                    const newTitle = e.target.value
                    const updated = notes.map((item) =>
                      item.id === activeNote.id ? { ...item, title: newTitle, updatedAt: Date.now() } : item
                    )
                    triggerSave(updated)
                  }}
                  placeholder="Note Title..."
                  className="w-full bg-transparent font-bold text-[14px] text-neutral-900 outline-none select-text"
                />
              </div>

              {/* Textarea for Note Content */}
              <div className="flex-1 w-full py-1.5 select-text overflow-hidden">
                <textarea
                  ref={contentTextareaRef}
                  value={activeNote.content}
                  onChange={(e) => handleUpdateNoteContent(e.target.value)}
                  placeholder="Jot down a quick thought or note... (auto-saves automatically)"
                  spellCheck={false}
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  className="w-full h-full bg-transparent resize-none outline-none text-[12px] text-neutral-800 placeholder:text-neutral-400 leading-relaxed select-text no-scrollbar"
                />
              </div>

              {/* Bottom Card Footer */}
              <div className="flex items-center justify-between text-[10px] text-black pt-1 border-t border-black/[0.06] shrink-0 font-mono">
                <span className="text-black/80 font-medium">
                  {activeCharCount > 0
                    ? `${activeWordCount} word${activeWordCount === 1 ? '' : 's'} • ${activeCharCount} chars`
                    : 'Empty note'}
                </span>
                <span className="text-black font-semibold flex items-center gap-1 font-mono">
                  {saveStatus === 'saving' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-2.5 w-2.5 text-black stroke-[2.75]" />
                      <span>Auto-saved</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
