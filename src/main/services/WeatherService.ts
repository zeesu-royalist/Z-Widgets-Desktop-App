import { WeatherCity, WeatherData, DailyForecast } from '../../shared/types'
import { loadWeatherConfig, saveWeatherConfig, DEFAULT_WEATHER_CITY } from './StorageService'

const WMO_MAP: Record<number, string> = {
  0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Foggy', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
  56: 'Freezing Drizzle', 57: 'Freezing Drizzle', 61: 'Light Rain',
  63: 'Moderate Rain', 65: 'Heavy Rain', 66: 'Freezing Rain', 67: 'Freezing Rain',
  71: 'Snow Fall', 73: 'Snow Fall', 75: 'Snow Fall', 77: 'Snow Flurries',
  80: 'Rain Showers', 81: 'Rain Showers', 82: 'Rain Showers',
  85: 'Snow Showers', 86: 'Snow Showers', 95: 'Thunderstorm',
  96: 'Thunder & Hail', 99: 'Thunder & Hail'
}

export const getWeatherDescription = (code: number): string => WMO_MAP[code] ?? 'Fair Weather'

function formatForecastDay(dateStr: string, index: number): string {
  if (index === 0) return 'Today'
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' })
  } catch {
    return `Day ${index + 1}`
  }
}

export async function searchWeatherCities(query: string): Promise<WeatherCity[]> {
  const trimmed = (query || '').trim()
  if (trimmed.length < 2) return []

  const controller = new AbortController(), timeoutId = setTimeout(() => controller.abort(), 6000)
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=6&language=en&format=json`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data?.results)) return []

    return data.results.map((r: any) => ({
      id: String(r.id || `${r.latitude}_${r.longitude}`),
      name: r.name || trimmed, country: r.country || '', admin1: r.admin1 || undefined,
      latitude: Number(r.latitude), longitude: Number(r.longitude)
    }))
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('[WEATHER] Geocoding search error:', err)
    return []
  }
}

export async function fetchWeatherData(city: WeatherCity): Promise<WeatherData> {
  const controller = new AbortController(), timeoutId = setTimeout(() => controller.abort(), 7000)

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    const current = json.current || {}, daily = json.daily || {}
    const weatherCode = Number(current.weather_code ?? 0)
    const dailyList: DailyForecast[] = Array.isArray(daily.time)
      ? daily.time.map((d: string, i: number) => ({
          day: formatForecastDay(d, i), date: d,
          weatherCode: Number(daily.weather_code?.[i] ?? 0),
          tempMax: Math.round(Number(daily.temperature_2m_max?.[i] ?? 0)),
          tempMin: Math.round(Number(daily.temperature_2m_min?.[i] ?? 0))
        }))
      : []

    const weatherData: WeatherData = {
      city,
      temperature: Math.round(Number(current.temperature_2m ?? 20)),
      apparentTemperature: Math.round(Number(current.apparent_temperature ?? 20)),
      weatherCode,
      weatherDescription: getWeatherDescription(weatherCode),
      isDay: Boolean(current.is_day ?? 1),
      humidity: Math.round(Number(current.relative_humidity_2m ?? 50)),
      windSpeed: Math.round(Number(current.wind_speed_10m ?? 0)),
      daily: dailyList,
      updatedAt: Date.now()
    }
    saveWeatherConfig({ selectedCity: city, cachedWeather: weatherData })
    return weatherData
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn(`[WEATHER] Failed to fetch forecast for ${city.name}:`, err)
    const config = await loadWeatherConfig()
    if (config.cachedWeather && config.cachedWeather.city.name === city.name) return config.cachedWeather

    return {
      city, temperature: 24, apparentTemperature: 24, weatherCode: 0,
      weatherDescription: 'Fair (Offline)', isDay: true, humidity: 50, windSpeed: 5,
      daily: [{ day: 'Today', date: '', weatherCode: 0, tempMax: 26, tempMin: 18 }, { day: 'Tomorrow', date: '', weatherCode: 1, tempMax: 27, tempMin: 19 }],
      updatedAt: Date.now()
    }
  }
}

export async function getWeatherData(forceRefresh = false): Promise<WeatherData> {
  const config = await loadWeatherConfig()
  const city = config.selectedCity || DEFAULT_WEATHER_CITY
  const cached = config.cachedWeather
  if (!forceRefresh && cached && Date.now() - cached.updatedAt < 15 * 60 * 1000) return cached
  return fetchWeatherData(city)
}

export async function setWeatherCity(city: WeatherCity): Promise<WeatherData> {
  saveWeatherConfig({ selectedCity: city })
  return fetchWeatherData(city)
}
