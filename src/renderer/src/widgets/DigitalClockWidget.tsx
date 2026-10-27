import React, { useState, useEffect } from 'react'
import { X, Clock, Calendar } from 'lucide-react'

interface DigitalClockWidgetProps {
  widgetId: string
  onClose?: () => Promise<void>
}

export const DigitalClockWidget: React.FC<DigitalClockWidgetProps> = ({
  widgetId,
  onClose
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date())
  const [is24Hour, setIs24Hour] = useState<boolean>(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleClose = async (): Promise<void> => {
    if (onClose) return onClose()
    try {
      await (window.api?.closeSelf?.() ?? window.api?.closeWidget?.(widgetId))
    } catch {
      window.api?.closeWidget?.(widgetId)
    }
  }

  const hours = currentTime.getHours()
  const displayHours = is24Hour ? String(hours).padStart(2, '0') : String(hours % 12 || 12)
  const displayMinutes = String(currentTime.getMinutes()).padStart(2, '0')
  const displaySeconds = String(currentTime.getSeconds()).padStart(2, '0')
  const weekday = currentTime.toLocaleDateString(undefined, { weekday: 'long' })
  const formattedDate = currentTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <div className="w-screen h-screen p-2.5 flex items-center justify-center bg-transparent select-none overflow-hidden font-sans">
      <div className="titlebar-drag-region w-full h-full glass-panel rounded-apple-xl p-4 sm:p-5 flex flex-col justify-between shadow-glass-light dark:shadow-glass-dark border border-black/10 dark:border-white/10 relative group transition-all">
        {/* Top Header Row */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold tracking-wider uppercase">
              {weekday}
            </span>
          </div>

          <div className="titlebar-no-drag flex items-center gap-1">
            <button
              onClick={() => setIs24Hour((prev) => !prev)}
              title={is24Hour ? 'Switch to 12-hour format' : 'Switch to 24-hour format'}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {is24Hour ? '24H' : '12H'}
            </button>

            <button
              onClick={handleClose}
              aria-label="Close clock widget"
              title="Close widget"
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Large Readable Clock Display */}
        <div className="my-auto py-1 flex items-baseline justify-center gap-1">
          <span className="text-5xl sm:text-6xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 font-sans tabular-nums leading-none">
            {displayHours}:{displayMinutes}
          </span>

          <div className="flex flex-col items-start ml-1 self-center">
            {!is24Hour && (
              <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider leading-none">
                {hours >= 12 ? 'PM' : 'AM'}
              </span>
            )}
            <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 tabular-nums leading-tight mt-0.5">
              :{displaySeconds}
            </span>
          </div>
        </div>

        {/* Bottom Footer: Date Information */}
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-1 border-t border-black/[0.04] dark:border-white/[0.04] z-10">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {formattedDate}, {currentTime.getFullYear()}
            </span>
          </div>

          <span className="text-[10px] font-mono text-neutral-400">
            Z-Widgets
          </span>
        </div>
      </div>
    </div>
  )
}
