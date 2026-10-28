import React, { useState, useEffect } from 'react'
import { X, Clock } from 'lucide-react'

interface DigitalClockWidgetProps {
  widgetId: string
  onClose?: () => Promise<void>
}

export const DigitalClockWidget: React.FC<DigitalClockWidgetProps> = ({ widgetId, onClose }) => {
  const [time, setTime] = useState<Date>(() => new Date())
  const [is24Hour, setIs24Hour] = useState<boolean>(true)

  // Real-time 1s ticker
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
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

  const hours = time.getHours()
  const minutes = time.getMinutes()
  const seconds = time.getSeconds()
  const displayHours = is24Hour ? String(hours).padStart(2, '0') : String(hours % 12 || 12).padStart(2, '0')
  const displayMinutes = String(minutes).padStart(2, '0')
  const displaySeconds = String(seconds).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const weekday = time.toLocaleDateString('en-US', { weekday: 'long' })
  const formattedDate = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const year = time.getFullYear()

  // 7-day week strip (Mon -> Sun)
  const currentDayIndex = (time.getDay() + 6) % 7
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(time)
    d.setDate(time.getDate() - currentDayIndex + i)
    return {
      dayLetter: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
      dateNum: d.getDate(),
      isToday: i === currentDayIndex
    }
  })

  // Day of year & week of year
  const startOfYear = new Date(time.getFullYear(), 0, 1)
  const diffDays = Math.floor((time.getTime() - startOfYear.getTime()) / 86400000)
  const dayOfYear = diffDays + 1
  const weekOfYear = Math.max(1, Math.min(53, Math.ceil((diffDays + startOfYear.getDay() + 1) / 7)))

  // Calculate day progress percentage (0 - 100%)
  const totalSecondsToday = hours * 3600 + minutes * 60 + seconds
  const dayProgressPercent = Math.min(100, Math.max(0, (totalSecondsToday / 86400) * 100))

  return (
    <div className="w-screen h-screen flex bg-transparent select-none overflow-hidden font-sans">
      {/* Matte Black Container with zero outer shadow */}
      <div className="titlebar-drag-region w-full h-full bg-[#000000] rounded-[26px] p-3.5 flex flex-col justify-between border border-white/10 relative group text-white overflow-hidden shadow-none">
        
        {/* Top Header: Day & Date */}
        <div className="flex items-center justify-between z-10 leading-none">
          <span className="text-xs font-semibold text-white/95">
            {weekday}, {formattedDate}
          </span>
          <div className="titlebar-no-drag opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={() => setIs24Hour((p) => !p)}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-neutral-300 transition-colors cursor-pointer"
              title="Toggle 12H / 24H format"
            >
              {is24Hour ? '24H' : '12H'}
            </button>
            <button
              onClick={handleClose}
              className="p-0.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close widget"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Center Hero: Ultra-thin Architectural Digital Time */}
        <div
          className="flex items-start cursor-pointer leading-none"
          onClick={() => setIs24Hour((p) => !p)}
          title="Click to toggle 12H/24H format"
        >
          <span
            className="text-[44px] tracking-tight text-white font-sans tabular-nums leading-none"
            style={{ fontWeight: 200, fontVariantNumeric: 'slashed-zero' }}
          >
            {displayHours}:{displayMinutes}
          </span>
          <div className="flex flex-col ml-1.5 -mt-0.5">
            <span
              className="text-xs font-light text-white/80 font-sans tabular-nums leading-tight"
              style={{ fontWeight: 300 }}
            >
              :{displaySeconds}
            </span>
            {!is24Hour && (
              <span className="text-[9px] font-bold text-orange-400 font-mono tracking-wider leading-none mt-0.5">
                {ampm}
              </span>
            )}
          </div>
        </div>

        {/* Intermediate Element: Week Tracker & 7-Day Micro Strip */}
        <div className="w-full">
          <div className="flex items-center justify-between text-[9px] font-mono text-white/50 uppercase tracking-wider mb-1 px-0.5 leading-none">
            <span className="flex items-center gap-1.5">
              Week {weekOfYear}
            </span>
            <span>Day {dayOfYear} / 365</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d, i) => (
              <div
                key={i}
                className={`flex flex-col items-center justify-center py-1 rounded-[7px] transition-all ${
                  d.isToday
                    ? 'bg-[#ff5500] text-black font-extrabold shadow-[0_0_10px_rgba(255,85,0,0.35)]'
                    : 'bg-white/[0.04] border border-white/[0.06] text-white/60 hover:bg-white/[0.08]'
                }`}
              >
                <span className={`text-[8px] font-semibold leading-none ${d.isToday ? 'text-black/75' : 'text-white/40'}`}>
                  {d.dayLetter}
                </span>
                <span className="text-[11px] font-mono font-bold leading-tight mt-0.5">
                  {d.dateNum}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Section: Day Progress & Electric Orange Capsule */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-1 px-0.5 leading-none">
            <span className="text-[11px] font-medium text-white/90">Day Progress</span>
            <span className="bg-[#ff5500] text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded-full font-mono">
              {hours}H {displayMinutes}M
            </span>
          </div>

          <div className="w-full bg-[#ff5500] rounded-xl px-2.5 py-1 text-black select-none shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold leading-tight">
              <span>{is24Hour ? '00:00' : '12:00 AM'}</span>
              <span>{is24Hour ? '24:00' : '11:59 PM'}</span>
            </div>
            <div className="relative w-full h-2 my-0.5 flex items-center">
              <div className="w-full h-1.5 flex justify-between items-center opacity-70">
                {Array.from({ length: 36 }).map((_, i) => (
                  <span key={i} className="w-[1px] h-1.5 bg-black" />
                ))}
              </div>
              <div
                className="absolute left-0 h-[2.5px] bg-black rounded-full transition-all duration-1000"
                style={{ width: `${dayProgressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] font-bold tracking-wider leading-tight">
              <span>AM</span>
              <span>PM</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Date & Z-Widgets Brand */}
        <div className="flex items-center justify-between pt-0.5 text-white/80 leading-none text-xs">
          <span className="font-light font-sans tracking-wide text-white/90" style={{ fontWeight: 200 }}>
            {year}
          </span>
          <div className="flex items-center gap-1 font-mono text-[10px] text-white/70">
            <Clock className="h-3 w-3 text-orange-400" />
            <span>Z-Widgets</span>
          </div>
        </div>

      </div>
    </div>
  )
}
