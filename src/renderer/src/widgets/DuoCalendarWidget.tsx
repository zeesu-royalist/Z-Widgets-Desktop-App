import React, { useState, useEffect, useMemo } from 'react'
import { CloudSun, Sun, CloudRain, X } from 'lucide-react'
import { WeatherData } from '../../../shared/types'

const MATCH_DATA = [
  { offset: 2, time: '16:00', teams: 'TOTTENHAM - ASTON VILLA' },
  { offset: 4, time: '20:45', teams: 'REAL MADRID - DORTMUND' },
  { offset: 6, time: '18:30', teams: 'ARSENAL - LIVERPOOL' }
]

export const DuoCalendarWidget: React.FC<{ widgetId: string; onClose?: () => Promise<void> }> = ({ widgetId, onClose }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [matchKey, setMatchKey] = useState<string | null>(null)

  // Auto-sync real-time clock & current place weather
  useEffect(() => {
    let active = true
    const clock = setInterval(() => setNow(new Date()), 60000)
    const loadWeather = () => window.api?.getWeatherData?.().then(d => active && d && setWeather(d)).catch(() => {})
    loadWeather()
    const weatherTimer = setInterval(loadWeather, 900000)

    return () => {
      active = false
      clearInterval(clock)
      clearInterval(weatherTimer)
    }
  }, [])

  const handleClose = async (): Promise<void> => {
    if (onClose) return onClose()
    try {
      if (window.api?.closeSelf) await window.api.closeSelf()
      else if (window.api?.closeWidget) await window.api.closeWidget(widgetId)
    } catch {
      window.api?.closeWidget?.(widgetId).catch(() => {})
    }
  }

  // Generate 2-week strip starting on Sunday of current week
  const days = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    return Array.from({ length: 14 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }, [now])

  // Map upcoming match events dynamically to future days
  const matches = useMemo(() => MATCH_DATA.map(m => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + m.offset)
    return { ...m, key: d.toDateString(), label: `${d.getDate()}/${d.getMonth() + 1}, ${m.time}` }
  }), [now])

  const curMatch = matches.find(m => m.key === matchKey) || matches[0]

  // Real temperature and weather metrics for current location
  const temp = weather ? Math.round(weather.temperature) : 23
  const low = weather?.daily?.[0]?.tempMin !== undefined ? Math.round(weather.daily[0].tempMin) : temp - 3
  const high = weather?.daily?.[0]?.tempMax !== undefined ? Math.round(weather.daily[0].tempMax) : temp + 4
  const code = weather?.weatherCode
  const WeatherIcon = code === 0 ? Sun : (code && ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))) ? CloudRain : CloudSun

  return (
    <div className="w-screen h-screen p-2 flex items-center justify-center bg-transparent select-none overflow-hidden font-sans">
      <div className="titlebar-drag-region group relative w-full h-full rounded-[26px] overflow-hidden cursor-move flex select-none shadow-none border border-black/5">
        {/* Left Side: Sunny Yellow Weather Section */}
        <div className="w-[36%] h-full flex flex-col justify-between pt-3 pb-3.5 select-none relative shrink-0" style={{ background: '#ffde00' }}>
          {/* Black Capsule Pill: Exact local temperature */}
          <div className="w-[95%] h-[50px] bg-black rounded-r-full flex items-center justify-between px-3.5 shadow-none">
            <span className="text-white font-bold text-[30px] leading-none tabular-nums tracking-tight ml-0.5">
              {temp}°
            </span>
            <WeatherIcon className="h-6 w-6 text-white stroke-[2.2] shrink-0 mr-1" />
          </div>

          {/* Condition & High/Low & City */}
          <div className="px-3.5 flex flex-col min-w-0">
            <span className="text-[16px] font-black text-neutral-950 leading-tight tracking-tight truncate">
              {weather?.weatherDescription || 'Fair'}
            </span>
            <div className="flex items-center justify-between text-[11.5px] font-bold text-neutral-900/90 leading-tight tracking-tight mt-0.5">
              <span>L:{low}° H:{high}°</span>
              {weather?.city?.name && (
                <span className="text-[10px] font-semibold text-neutral-800/80 truncate ml-1 max-w-[42px]" title={weather.city.name}>
                  {weather.city.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Frosted Silver Calendar & Match Agenda */}
        <div
          className="flex-1 h-full flex flex-col justify-between p-3.5 px-4 relative select-none"
          style={{ background: 'linear-gradient(135deg, #e4e7e9 0%, #dfe3e5 50%, #d8dcde 100%)' }}
        >
          {/* Header: Current Date + Hover Close Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline tracking-tight font-black uppercase text-[14px]">
              <span className="text-neutral-950">{now.toLocaleDateString('en-US', { weekday: 'long' })},</span>
              <span className="text-neutral-800 ml-1">{now.toLocaleDateString('en-US', { month: 'short' })} {now.getDate()}</span>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close widget"
              className="titlebar-no-drag opacity-0 group-hover:opacity-100 p-1 -mr-1 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-black/5 transition-all cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 2-Week Calendar Strip (S M T W T F S) */}
          <div className="w-full grid grid-cols-7 gap-y-1 text-center font-sans my-auto">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={i} className="text-[11px] font-black text-neutral-900/90 leading-none">{d}</span>
            ))}

            {days.map((d, i) => {
              const isToday = d.toDateString() === now.toDateString()
              const hasMatch = matches.some(m => m.key === d.toDateString())
              const isSelected = curMatch.key === d.toDateString()

              return (
                <button
                  key={i}
                  onClick={() => hasMatch && setMatchKey(d.toDateString())}
                  className="titlebar-no-drag flex flex-col items-center justify-center p-0 border-0 bg-transparent cursor-pointer group/day"
                  title={hasMatch ? `Match on ${d.toLocaleDateString()}` : undefined}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold leading-none transition-all ${
                      isToday
                        ? 'bg-[#ffde00] text-neutral-950'
                        : isSelected && hasMatch
                        ? 'bg-neutral-950 text-white'
                        : 'text-neutral-900 group-hover/day:text-black'
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  <span className={`w-1 h-1 rounded-full mt-0.5 transition-colors ${hasMatch ? 'bg-[#7a858d]' : 'bg-transparent'}`} />
                </button>
              )
            })}
          </div>

          {/* Bottom Match Card */}
          <div
            onClick={() => setMatchKey(matches[(matches.findIndex(m => m.key === curMatch.key) + 1) % matches.length].key)}
            className="titlebar-no-drag flex items-center cursor-pointer group/match -mb-0.5"
            title="Click to cycle matches"
          >
            <div className="w-[3.5px] h-[24px] bg-[#6c7782] rounded-full shrink-0 mr-2" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-semibold text-neutral-600 leading-none">{curMatch.label}</span>
              <span className="text-[11.5px] font-black text-neutral-950 tracking-tight leading-none mt-1 truncate">
                {curMatch.teams}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
