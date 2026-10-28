import React, { useEffect, useState } from 'react'
import { ArrowUp, Bell, X } from 'lucide-react'

interface DepthDiveWidgetProps {
  widgetId: string
  onClose?: () => Promise<void>
}

export const DepthDiveWidget: React.FC<DepthDiveWidgetProps> = ({ widgetId, onClose }) => {
  // Live dive duration in seconds (starting at 35:47 = 2147s)
  const [diveSeconds, setDiveSeconds] = useState(2147)

  // Surface time in seconds (starting at 03:30 = 210s)
  const [surfaceSeconds, setSurfaceSeconds] = useState(210)

  // Subtle natural depth reading (centered at 29 ft)
  const [depth, setDepth] = useState(29)

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setDiveSeconds((prev) => prev + 1)
      setSurfaceSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Format mm:ss
  const formatTime = (totalSec: number): string => {
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleClose = async (): Promise<void> => {
    if (onClose) return onClose()
    try {
      if (window.api?.closeSelf) await window.api.closeSelf()
      else if (window.api?.closeWidget) await window.api.closeWidget(widgetId)
    } catch {
      window.api?.closeWidget?.(widgetId).catch(() => {})
    }
  }

  // Vertical ladder scale ticks (8 ticks total)
  // Indicator at index 3 (4th tick from top)
  const TICK_COUNT = 8
  const ACTIVE_TICK = 3

  return (
    <div className="w-screen h-screen p-2 flex items-center justify-center bg-transparent select-none overflow-hidden font-sans">
      <div
        onDoubleClick={handleClose}
        className="titlebar-drag-region group relative w-full h-full rounded-[28px] overflow-hidden cursor-move flex flex-col justify-between p-4 select-none"
        style={{
          background: 'linear-gradient(180deg, #4b4205 0%, #3e3604 50%, #302a03 100%)'
        }}
        title="Double-click to close"
      >
        {/* Top Header: 29 ft on left, 35:47 on right */}
        <div className="relative z-10 flex items-baseline justify-between w-full px-1 pt-0.5">
          {/* Depth: 29 ft */}
          <div className="flex items-baseline tracking-tight">
            <span className="font-bold text-[30px] text-white leading-none tabular-nums">
              {depth}
            </span>
            <span className="font-semibold text-[17px] text-white/90 ml-1.5 leading-none">
              ft
            </span>
          </div>

          {/* Right: Dive Timer 35:47 with hover close button */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-[28px] text-white font-mono tabular-nums leading-none tracking-tight">
              {formatTime(diveSeconds)}
            </span>
            <button
              onClick={handleClose}
              aria-label="Close widget"
              title="Close widget"
              className="titlebar-no-drag opacity-0 group-hover:opacity-100 p-1 -mr-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Main Body: Left Depth Scale + Center Surface Time Card + Right Alarm Ring Card */}
        <div className="relative z-10 flex items-center gap-3 w-full h-[76px] mt-1">
          {/* Left: Vertical Depth / Ascent Ladder Gauge */}
          <div className="w-9 h-full flex flex-col justify-between items-start py-0.5 relative">
            {Array.from({ length: TICK_COUNT }, (_, i) => {
              const isActive = i === ACTIVE_TICK
              return (
                <div key={i} className="flex items-center w-full h-[3px]">
                  {isActive ? (
                    <div className="flex items-center w-full">
                      {/* White pointer triangle pointing right */}
                      <svg width="10" height="12" viewBox="0 0 10 12" className="shrink-0 -ml-1">
                        <polygon points="0,1 9,6 0,11" fill="#ffffff" />
                      </svg>
                      {/* Active white tick line extending across */}
                      <span className="flex-1 h-[2.5px] bg-white rounded-full ml-0.5" />
                    </div>
                  ) : (
                    <span className="w-5 h-[2px] rounded-full bg-[#756a28]/70 ml-2.5" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Center Card: Surface Time */}
          <div
            className="flex-1 h-full rounded-[18px] px-3.5 py-2.5 flex flex-col justify-between shadow-inner"
            style={{ background: '#2b2502' }}
          >
            {/* Top row: White arrow up + Glowing yellow time */}
            <div className="flex items-center justify-between">
              <ArrowUp className="h-5 w-5 text-white stroke-[3.2] -ml-0.5" />
              <span className="font-bold text-[26px] text-[#edd75e] font-mono tabular-nums leading-none tracking-tight">
                {formatTime(surfaceSeconds)}
              </span>
            </div>

            {/* Bottom row: Surface Time label */}
            <span className="text-[13px] font-semibold text-[#b8ad82] tracking-tight leading-none mt-auto">
              Surface Time
            </span>
          </div>

          {/* Right Card: Alarm / Safety Ring Card */}
          <div
            className="w-[74px] h-full rounded-[18px] flex items-center justify-center shadow-inner relative shrink-0"
            style={{ background: '#2b2502' }}
          >
            {/* 3/4 Yellow Circular Progress Ring */}
            <svg width="48" height="48" viewBox="0 0 48 48" className="absolute inset-0 m-auto">
              {/* Background track circle */}
              <circle
                cx="24"
                cy="24"
                r="18"
                fill="none"
                stroke="#4a4005"
                strokeWidth="3.5"
                strokeDasharray="85 28"
                strokeDashoffset="12"
                strokeLinecap="round"
                transform="rotate(-90 24 24)"
              />
              {/* Active yellow glowing ring arc */}
              <circle
                cx="24"
                cy="24"
                r="18"
                fill="none"
                stroke="#edd75e"
                strokeWidth="3.8"
                strokeDasharray="85 28"
                strokeDashoffset="12"
                strokeLinecap="round"
                transform="rotate(-90 24 24)"
              />
            </svg>

            {/* Centered White Bell Icon */}
            <Bell className="h-4.5 w-4.5 text-white fill-white relative z-10" />
          </div>
        </div>
      </div>
    </div>
  )
}
