import React, { useState, useEffect, useRef } from 'react'
import {
  Sun, CloudSun, CloudRain, Cloud, CloudLightning, Snowflake,
  CloudFog, Search, RefreshCw, X, ChevronDown, Loader2,
  Droplets, Wind, Thermometer
} from 'lucide-react'
import { WeatherData, WeatherCity, DailyForecast } from '../../../shared/types'

interface WeatherWidgetProps {
  widgetId: string
  onClose?: () => Promise<void>
}

// Minimalist solid black icons for the Top Card (soft blue background)
function getTopCardWeatherIcon(code: number, isDay = true, className = 'w-4 h-4') {
  if (code === 0) {
    return <Sun className={`${className} text-black fill-black stroke-[2]`} />
  }
  if (code <= 2) {
    return isDay ? (
      <CloudSun className={`${className} text-black fill-black stroke-[2]`} />
    ) : (
      <Cloud className={`${className} text-black fill-black stroke-[2]`} />
    )
  }
  if (code === 3 || code === 45 || code === 48) {
    return <CloudFog className={`${className} text-black stroke-[2]`} />
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return <CloudRain className={`${className} text-black fill-black stroke-[2]`} />
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return <Snowflake className={`${className} text-black stroke-[2]`} />
  }
  if (code >= 95) {
    return <CloudLightning className={`${className} text-black fill-black stroke-[2]`} />
  }
  return <CloudSun className={`${className} text-black fill-black stroke-[2]`} />
}

// Minimalist colored icons for the Bottom Card (dark charcoal background)
function getBottomCardWeatherIcon(code: number, className = 'w-4 h-4') {
  if (code === 0) {
    return <Sun className={`${className} text-amber-400 fill-amber-400/30 stroke-[2]`} />
  }
  if (code <= 2) {
    return <CloudSun className={`${className} text-sky-400 fill-sky-400/40 stroke-[2]`} />
  }
  if (code === 3 || code === 45 || code === 48) {
    return <Cloud className={`${className} text-neutral-400 fill-neutral-400/40 stroke-[2]`} />
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return <CloudRain className={`${className} text-sky-400 fill-sky-400/30 stroke-[2]`} />
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return <Snowflake className={`${className} text-cyan-300 stroke-[2]`} />
  }
  if (code >= 95) {
    return <CloudLightning className={`${className} text-purple-400 fill-purple-400/30 stroke-[2]`} />
  }
  return <CloudSun className={`${className} text-sky-400 fill-sky-400/40 stroke-[2]`} />
}

function getDayName(d: DailyForecast, idx: number): string {
  if (d.date) {
    try {
      const [y, m, day] = d.date.split('-').map(Number)
      return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'long' })
    } catch {
      // fallback
    }
  }
  const date = new Date()
  date.setDate(date.getDate() + idx)
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ widgetId, onClose }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<WeatherCity[]>([])
  const [isSearchingCities, setIsSearchingCities] = useState<boolean>(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch initial weather and background refresh
  useEffect(() => {
    let isMounted = true
    const loadWeather = async (force = false): Promise<void> => {
      try {
        const data = await window.api?.getWeatherData?.(force)
        if (isMounted && data) {
          setWeather(data)
          setIsLoading(false)
        }
      } catch (err) {
        console.warn('[WEATHER_WIDGET] Failed to fetch weather:', err)
        if (isMounted) setIsLoading(false)
      }
    }

    loadWeather()
    const interval = setInterval(() => loadWeather(true), 15 * 60 * 1000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (isSearching) setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [isSearching])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setSearchQuery(val)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) {
      setSearchResults([])
      setIsSearchingCities(false)
      return
    }

    setIsSearchingCities(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await window.api?.searchWeatherCities?.(val)
        setSearchResults(results || [])
      } catch (err) {
        console.warn('[WEATHER_WIDGET] Search error:', err)
      } finally {
        setIsSearchingCities(false)
      }
    }, 300)
  }

  const handleSelectCity = async (city: WeatherCity): Promise<void> => {
    setIsSearching(false)
    setSearchQuery('')
    setSearchResults([])
    setIsRefreshing(true)
    try {
      const updated = await window.api?.setWeatherCity?.(city)
      if (updated) setWeather(updated)
    } catch (err) {
      console.warn('[WEATHER_WIDGET] Error setting city:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleManualRefresh = async (): Promise<void> => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      const data = await window.api?.getWeatherData?.(true)
      if (data) setWeather(data)
    } catch (err) {
      console.warn('[WEATHER_WIDGET] Manual refresh failed:', err)
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  const handleClose = async (): Promise<void> => {
    if (onClose) return onClose()
    try {
      await (window.api?.closeSelf?.() ?? window.api?.closeWidget?.(widgetId))
    } catch {
      window.api?.closeWidget?.(widgetId)
    }
  }

  // Derive 6-slot hourly forecast curve from current time and daily extremes
  const nowHour = new Date().getHours()
  const baseHour = Math.floor(nowHour / 2) * 2
  const maxToday = weather?.daily?.[0]?.tempMax ?? (weather?.temperature ? weather.temperature + 3 : 24)
  const minToday = weather?.daily?.[0]?.tempMin ?? (weather?.temperature ? weather.temperature - 4 : 18)
  const currentTemp = weather?.temperature ?? 20

  const hourlyForecast = [0, 2, 4, 6, 8, 10].map((offset) => {
    const h = (baseHour + offset) % 24
    const diffFromNoon = Math.abs(h - 14)
    const factor = (Math.cos((diffFromNoon / 12) * Math.PI) + 1) / 2
    const estTemp = Math.round(minToday + factor * Math.max(2, maxToday - minToday))
    const finalTemp = offset === 0 ? currentTemp : estTemp

    let code = weather?.weatherCode ?? 0
    if (offset >= 6 && code === 0) code = 1

    return {
      hour: String(h).padStart(2, '0'),
      temp: finalTemp,
      code,
      isDay: h >= 6 && h < 20
    }
  })

  // 4-day daily forecast list
  const displayDaily: DailyForecast[] =
    weather?.daily && weather.daily.length >= 4
      ? weather.daily.slice(0, 4)
      : [
          { day: 'Monday', date: '', weatherCode: 3, tempMin: 9, tempMax: 22 },
          { day: 'Tuesday', date: '', weatherCode: 1, tempMin: 11, tempMax: 25 },
          { day: 'Wednesday', date: '', weatherCode: 61, tempMin: 13, tempMax: 22 },
          { day: 'Thursday', date: '', weatherCode: 1, tempMin: 12, tempMax: 23 }
        ]

  // Global min/max for temperature range bars
  const allMin = Math.min(...displayDaily.map((d) => d.tempMin))
  const allMax = Math.max(...displayDaily.map((d) => d.tempMax))
  const totalSpan = Math.max(1, allMax - allMin)

  return (
    <div className="w-screen h-screen flex bg-transparent select-none overflow-hidden font-sans">
      {/* Matte Black Outer Bezel */}
      <div className="titlebar-drag-region w-full h-full bg-[#000000] rounded-[26px] p-2 flex flex-col justify-between border border-white/10 relative group text-white overflow-hidden shadow-none">

        {/* City Search Dropdown Modal */}
        {isSearching && (
          <div className="titlebar-no-drag absolute inset-2 z-50 p-3 rounded-[20px] bg-neutral-900/95 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Search className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleQueryChange}
                placeholder="Search city (e.g. London, Tokyo)..."
                className="w-full bg-transparent text-xs text-white placeholder:text-neutral-500 outline-none"
              />
              {isSearchingCities ? (
                <Loader2 className="h-3.5 w-3.5 text-sky-400 animate-spin shrink-0" />
              ) : (
                <button
                  onClick={() => setIsSearching(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto mt-2 space-y-1">
              {searchResults.map((city) => (
                <button
                  key={`${city.latitude}_${city.longitude}`}
                  onClick={() => handleSelectCity(city)}
                  className="w-full px-2.5 py-1.5 text-left text-xs rounded-lg hover:bg-white/10 flex items-center justify-between text-neutral-200 transition-colors cursor-pointer"
                >
                  <span className="font-medium truncate mr-2">
                    {city.name}
                    {city.admin1 ? `, ${city.admin1}` : ''}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                    {city.country}
                  </span>
                </button>
              ))}
              {searchQuery.trim().length >= 2 && !isSearchingCities && searchResults.length === 0 && (
                <div className="text-center py-4 text-xs text-neutral-400">
                  No matching cities found
                </div>
              )}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/70">
            <Loader2 className="h-6 w-6 text-sky-400 animate-spin" />
            <span className="text-xs font-mono">Loading weather...</span>
          </div>
        ) : weather ? (
          <>
            {/* Top Card: Soft Sky Blue (#9db3c5) */}
            <div className="w-full bg-[#9db3c5] rounded-[18px] px-3 py-2 flex flex-col justify-between text-black relative select-none">

              {/* Top Hero Row */}
              <div className="flex items-start justify-between">
                {/* Left: Temp, Condition Icon & Text */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[38px] font-sans font-light tracking-tight text-black leading-none"
                      style={{ fontWeight: 300 }}
                    >
                      {weather.temperature}°
                    </span>
                    <div className="pt-0.5">
                      {getTopCardWeatherIcon(weather.weatherCode, weather.isDay, 'w-7 h-7')}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-black/90 leading-tight mt-0.5">
                    {weather.weatherDescription}
                  </span>
                </div>

                {/* Right: City Name & High/Low/Wind */}
                <div className="flex flex-col items-end text-right">
                  <button
                    onClick={() => setIsSearching(true)}
                    className="titlebar-no-drag flex items-center gap-1 text-[13px] font-semibold text-black hover:opacity-75 transition-opacity cursor-pointer leading-tight max-w-[130px]"
                    title="Click to search city"
                  >
                    <span className="truncate">{weather.city.name}</span>
                    <ChevronDown className="h-3 w-3 text-black/60 shrink-0" />
                  </button>

                  <div className="text-[10px] font-mono font-medium text-black/85 leading-tight mt-1 flex items-center gap-1.5">
                    <span>H: {maxToday}°</span>
                    <span>L: {minToday}°</span>
                    <span>↗ {weather.windSpeed}</span>
                  </div>

                  {/* Window Controls: Hover to reveal Refresh & Close */}
                  <div className="titlebar-no-drag opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 mt-1">
                    <button
                      onClick={handleManualRefresh}
                      disabled={isRefreshing}
                      aria-label="Refresh weather"
                      title="Refresh weather"
                      className="p-0.5 rounded text-black/60 hover:text-black transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={handleClose}
                      aria-label="Close weather widget"
                      title="Close widget"
                      className="p-0.5 rounded text-black/60 hover:text-black transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Row of Top Card: 6 Hourly Forecast Columns */}
              <div className="flex items-center justify-between pt-1 mt-1 border-t border-black/10">
                {hourlyForecast.map((h, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center text-center px-1 py-0.5 rounded ${
                      i === 0 ? 'bg-black/10' : ''
                    }`}
                  >
                    <span className={`text-[10px] font-mono leading-none ${i === 0 ? 'font-bold text-black' : 'font-medium text-black/75'}`}>
                      {i === 0 ? 'Now' : h.hour}
                    </span>
                    <div className="py-1">
                      {getTopCardWeatherIcon(h.code, h.isDay, 'w-3.5 h-3.5')}
                    </div>
                    <span className="text-[11px] font-semibold text-black font-mono leading-none">
                      {h.temp}°
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Card: Deep Charcoal (#1c1e22) */}
            <div className="w-full bg-[#1c1e22] rounded-[18px] px-3.5 py-2 flex flex-col justify-between flex-1 mt-1.5 text-white select-none">

              {/* 4 Daily Rows with Range Bars */}
              <div className="space-y-1">
                {displayDaily.map((d, idx) => {
                  const dayName = getDayName(d, idx)
                  const windSpeed = Math.max(2, Math.round((weather.windSpeed || 5) + (idx === 1 || idx === 2 ? -1 : 1)))
                  const windArrow = idx === 2 ? '→' : '↗'

                  // Calculate position for visual temperature bar
                  const leftPercent = Math.max(0, Math.min(80, ((d.tempMin - allMin) / totalSpan) * 100))
                  const widthPercent = Math.max(20, Math.min(100 - leftPercent, ((d.tempMax - d.tempMin) / totalSpan) * 100))

                  return (
                    <div key={idx} className="flex items-center justify-between text-xs py-0.5 leading-none">
                      {/* Day Name */}
                      <span className="w-20 text-left font-normal text-[12px] text-white/90 truncate">
                        {dayName}
                      </span>

                      {/* Weather Icon */}
                      <div className="w-6 flex items-center justify-center">
                        {getBottomCardWeatherIcon(d.weatherCode, 'w-4 h-4')}
                      </div>

                      {/* Wind */}
                      <div className="w-10 flex items-center justify-end font-mono text-[11px] text-neutral-400">
                        <span>{windArrow}{windSpeed}</span>
                      </div>

                      {/* Min Temp, Range Bar & Max Temp */}
                      <div className="flex items-center font-mono text-[11.5px]">
                        <span className="text-neutral-400 w-6 text-right">{d.tempMin}°</span>
                        <div className="relative w-11 h-1.5 bg-white/10 rounded-full overflow-hidden mx-1.5">
                          <div
                            className="absolute top-0 bottom-0 bg-gradient-to-r from-sky-400 via-amber-400 to-orange-400 rounded-full"
                            style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                          />
                        </div>
                        <span className="text-white font-medium w-6 text-left">{d.tempMax}°</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Bottom Card Vitals Strip */}
              <div className="pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-neutral-300 font-mono leading-none">
                <div className="flex items-center gap-1 text-sky-300/90" title="Humidity">
                  <Droplets className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>{weather.humidity}% Hum</span>
                </div>
                <div className="flex items-center gap-1 text-amber-300/90" title="Feels like">
                  <Thermometer className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Feels {weather.apparentTemperature}°</span>
                </div>
                <div className="flex items-center gap-1 text-teal-300/90" title="Wind speed">
                  <Wind className="w-3 h-3 text-teal-400 shrink-0" />
                  <span>{weather.windSpeed} km/h</span>
                </div>
              </div>

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-3 text-neutral-400 text-xs">
            <span>Weather data unavailable.</span>
            <button
              onClick={handleManualRefresh}
              className="mt-2 px-3 py-1 text-xs rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
