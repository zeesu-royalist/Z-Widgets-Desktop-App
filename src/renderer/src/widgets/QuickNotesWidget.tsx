import React, { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, X, Check, AlertCircle } from 'lucide-react'

interface QuickNotesWidgetProps {
  widgetId: string
  onClose?: () => Promise<void>
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export const QuickNotesWidget: React.FC<QuickNotesWidgetProps> = ({ widgetId, onClose }) => {
  const [content, setContent] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestContentRef = useRef<string>('')
  latestContentRef.current = content

  useEffect(() => {
    let isMounted = true
    window.api?.getNoteContent?.(widgetId).then((saved) => {
      if (!isMounted) return
      setContent(saved || '')
      latestContentRef.current = saved || ''
      setIsLoaded(true)
      if (saved) setSaveStatus('saved')
    }).catch(() => { if (isMounted) setIsLoaded(true) })
    return () => { isMounted = false }
  }, [widgetId])

  const flushSave = useCallback(async (text: string): Promise<boolean> => {
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null }
    try {
      const ok = await window.api?.saveNoteContent?.(widgetId, text)
      setSaveStatus(ok ? 'saved' : 'error')
      return Boolean(ok)
    } catch {
      setSaveStatus('error')
      return false
    }
  }, [widgetId])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        window.api?.saveNoteContent?.(widgetId, latestContentRef.current).catch(() => {})
      }
    }
  }, [widgetId])

  const handleContentChange = (newText: string): void => {
    setContent(newText)
    latestContentRef.current = newText
    setSaveStatus('saving')
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => flushSave(newText), 350)
  }

  const handleClose = async (): Promise<void> => {
    if (debounceTimerRef.current) await flushSave(latestContentRef.current)
    if (onClose) return onClose()
    try { await (window.api?.closeSelf?.() ?? window.api?.closeWidget?.(widgetId)) }
    catch { window.api?.closeWidget?.(widgetId) }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const charCount = content.length

  return (
    <div className="w-screen h-screen p-2.5 flex items-center justify-center bg-transparent select-none overflow-hidden font-sans">
      <div className="w-full h-full glass-panel rounded-apple-xl p-4 flex flex-col justify-between shadow-glass-light dark:shadow-glass-dark border border-black/10 dark:border-white/10 relative group transition-all">
        {/* Top Header Row */}
        <div className="titlebar-drag-region flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06] z-10 cursor-move">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <div className="p-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-800 dark:text-neutral-200">
              Quick Notes
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
              aria-label="Close notes widget"
              title="Close widget (keeps note saved)"
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Central Note Text Area */}
        <div className="titlebar-no-drag flex-1 w-full my-2.5 relative select-text">
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={isLoaded ? 'Jot down a quick thought or note...' : 'Loading note...'}
            disabled={!isLoaded}
            spellCheck={false}
            className="w-full h-full bg-transparent resize-none outline-none text-xs sm:text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 font-sans leading-relaxed selection:bg-amber-500/30 select-text cursor-text titlebar-no-drag"
          />
        </div>

        {/* Bottom Footer: Stats */}
        <div className="titlebar-drag-region flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 pt-1.5 border-t border-black/[0.04] dark:border-white/[0.04] z-10 cursor-move">
          <span className="font-mono">
            {charCount > 0 ? `${wordCount} word${wordCount === 1 ? '' : 's'} • ${charCount} chars` : 'Empty note'}
          </span>
          <span className="font-mono text-neutral-400">
            Z-Widgets
          </span>
        </div>
      </div>
    </div>
  )
}
