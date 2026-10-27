import React, { useState, useEffect, useRef } from 'react'
import {
  Sun, CloudSun, CloudRain, Cloud, CloudLightning, Snowflake,
  CloudFog, Wind, Droplets, Search, RefreshCw, MapPin, X, ChevronDown, Loader2
} from 'lucide-react'
import { WeatherData, WeatherCity } from '../../../shared/types'

interface WeatherWidgetProps {
  widgetId: string
  onClose?: () => Promise<void>
}

function getWeatherIcon(code: number, isDay = true, className = 'h-5 w-5') {
  if (code === 0) return <Sun className={`${className} text-amber-500`} />
  if (code <= 2) return isDay ? <CloudSun className={`${className} text-amber-400`} /> : <Cloud className={`${className} text-indigo-300`} />
  if (code === 3 || code === 45 || code === 48) return <CloudFog className={`${className} text-neutral-400`} />
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain className={`${className} text-sky-400`} />
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <Snowflake className={`${className} text-cyan-300`} />
  if (code >= 95) return <CloudLightning className={`${className} text-purple-400`} />
  return <CloudSun className={`${className} text-amber-400`} />
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
        if (isMounted && data) { setWeather(data); setIsLoading(false) }
      } catch (err) {
        console.warn('[WEATHER_WIDGET] Failed to fetch weather:', err)
        if (isMounted) setIsLoading(false)
      }
    }

    loadWeather()
    const interval = setInterval(() => loadWeather(true), 15 * 60 * 1000)
    return () => { isMounted = false; clearInterval(interval) }
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
    try { await (window.api?.closeSelf?.() ?? window.api?.closeWidget?.(widgetId)) }
    catch { window.api?.closeWidget?.(widgetId) }
  }

  return (
    <div className="w-screen h-screen p-2.5 flex items-center justify-center bg-transparent select-none overflow-hidden font-sans">
      <div className="w-full h-full glass-panel rounded-apple-xl p-3.5 flex flex-col justify-between shadow-glass-light dark:shadow-glass-dark border border-black/10 dark:border-white/10 relative group transition-all">
        {/* Header */}
        <div className="titlebar-drag-region flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06] z-10 cursor-move">
          <button
            onClick={() => setIsSearching(!isSearching)}
            className="titlebar-no-drag flex items-center gap-1.5 px-2 py-1 rounded-apple-sm bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-neutral-800 dark:text-neutral-100 transition-colors cursor-pointer text-left max-w-[200px]"
            title="Change City"
          >
            <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <span className="text-xs font-semibold truncate">
              {weather?.city.name || 'Loading...'}
            </span>
            <ChevronDown className="h-3 w-3 text-neutral-400 shrink-0" />
          </button>

          <div className="titlebar-no-drag flex items-center gap-1">
            <button
              onClick={handleManualRefresh}
              aria-label="Refresh weather"
              title="Refresh weather"
              disabled={isRefreshing}
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
            </button>

            <button
              onClick={handleClose}
              aria-label="Close weather widget"
              title="Close widget"
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* City Search Dropdown Overlay */}
        {isSearching && (
          <div className="titlebar-no-drag absolute top-12 left-3 right-3 z-30 p-2.5 rounded-apple-md bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-xl space-y-2">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-apple-sm bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
              <Search className="h-3.5 w-3.5 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleQueryChange}
                placeholder="Search city (e.g. Mumbai, Tokyo)..."
                className="w-full bg-transparent text-xs text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400"
              />
              {isSearchingCities ? (
                <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
              ) : (
                <button
                  onClick={() => setIsSearching(false)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1">
                {searchResults.map((city) => (
                  <button
                    key={`${city.latitude}_${city.longitude}`}
                    onClick={() => handleSelectCity(city)}
                    className="w-full px-2 py-1.5 text-left text-xs rounded-apple-sm hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {city.name}
                      {city.admin1 ? `, ${city.admin1}` : ''}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {city.country}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.trim().length >= 2 && !isSearchingCities && searchResults.length === 0 && (
              <div className="text-center py-2 text-[11px] text-neutral-400">
                No matching cities found
              </div>
            )}
          </div>
        )}

        {/* Main Weather Card Body */}
        <div className="titlebar-no-drag my-1 flex-1 flex flex-col justify-between select-text">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              <span className="text-xs text-neutral-400 font-medium">Fetching weather...</span>
            </div>
          ) : weather ? (
            <>
              {/* Current Temperature & Condition */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 font-sans">
                      {weather.temperature}°
                    </span>
                    <span className="text-xs text-neutral-400 font-medium">C</span>
                  </div>
                  <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {weather.weatherDescription}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    Feels like {weather.apparentTemperature}°C
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-2 rounded-apple-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
                  {getWeatherIcon(weather.weatherCode, weather.isDay, 'h-10 w-10')}
                </div>
              </div>

              {/* Vitals row: Humidity & Wind */}
              <div className="grid grid-cols-2 gap-2 my-1">
                {([
                  [Droplets, 'text-sky-500', 'Humidity', `${weather.humidity}%`],
                  [Wind, 'text-teal-500', 'Wind', `${weather.windSpeed} km/h`]
                ] as [React.ElementType, string, string, string][]).map(([Icon, color, label, val], i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded-apple-sm bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    <div className="text-[11px] leading-tight">
                      <span className="text-neutral-400 block text-[9px] uppercase font-mono">{label}</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{val}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 4-Day Forecast Grid */}
              <div className="grid grid-cols-4 gap-1 pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
                {weather.daily.slice(0, 4).map((d, idx) => (
                  <div
                    key={`${d.day}_${idx}`}
                    className="p-1 rounded-apple-sm bg-black/[0.015] dark:bg-white/[0.015] flex flex-col items-center justify-center text-center space-y-0.5"
                  >
                    <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                      {d.day}
                    </span>
                    <div className="py-0.5">
                      {getWeatherIcon(d.weatherCode, true, 'h-4 w-4')}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-neutral-800 dark:text-neutral-100">
                      {d.tempMax}°
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400">
                      {d.tempMin}°
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-3 text-neutral-400 text-xs">
              <span>Weather data unavailable.</span>
              <button
                onClick={handleManualRefresh}
                className="mt-2 px-3 py-1 text-xs rounded-apple-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="titlebar-drag-region flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 pt-1.5 border-t border-black/[0.04] dark:border-white/[0.04] z-10 cursor-move">
          <span className="truncate max-w-[200px]">
            {weather ? `${weather.city.name}, ${weather.city.country}` : 'Weather Live'}
          </span>
          <span className="font-mono text-neutral-400 shrink-0">Open-Meteo</span>
        </div>
      </div>
    </div>
  )
}
