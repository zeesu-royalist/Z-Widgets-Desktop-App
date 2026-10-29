export type Platform = 'darwin' | 'win32' | 'linux'
export type ThemeMode = 'light' | 'dark' | 'system'
export type WidgetPlacementMode = 'desktop' | 'floating' | 'always-on-top'

export interface AppInfo {
  name: string; version: string; platform: Platform
  electronVersion: string; chromeVersion: string; nodeVersion: string
  username?: string; hostname?: string
}

export interface WidgetWindowConfig {
  id: string; type?: string; title?: string
  width?: number; height?: number; x?: number; y?: number
  placementMode?: WidgetPlacementMode; isVisible?: boolean
  settings?: Record<string, unknown>
}

export interface ActiveWidgetInfo {
  id: string; type?: string; isVisible: boolean
  width: number; height: number; x: number; y: number
  placementMode: WidgetPlacementMode; settings?: Record<string, unknown>
}

export interface PersistedWidgetConfig {
  id: string; type: string; width: number; height: number
  x: number; y: number; isVisible: boolean; placementMode: WidgetPlacementMode
  settings?: Record<string, unknown>; updatedAt: number
}

export interface WidgetStorageSchema {
  schemaVersion: number; widgets: PersistedWidgetConfig[]
}

export interface StartupSettings {
  openAtLogin: boolean; openAsHidden: boolean
  isSupported: boolean; isPackaged: boolean
}

export interface AppSettingsSchema {
  schemaVersion: number; launchAtLogin: boolean
  openAsHidden: boolean; theme: ThemeMode
}

export interface NoteRecord {
  id: string; content: string; updatedAt: number
}

export interface NotesStorageSchema {
  schemaVersion: number; notes: Record<string, NoteRecord>
}

export interface TodoItem {
  id: string; text: string; completed: boolean; createdAt: number
}

export interface TodoStorageSchema {
  schemaVersion: number; todos: Record<string, TodoItem[]>
}

export interface SystemStats {
  cpuUsage: number; cpuModel: string; cpuCores: number
  totalMemGB: number; usedMemGB: number; freeMemGB: number
  memUsage: number; uptimeFormatted: string; platform: Platform
}

export interface WeatherCity {
  id: string; name: string; country: string; admin1?: string
  latitude: number; longitude: number
}

export interface DailyForecast {
  day: string; date: string; weatherCode: number; tempMax: number; tempMin: number
}

export interface WeatherData {
  city: WeatherCity; temperature: number; apparentTemperature: number
  weatherCode: number; weatherDescription: string; isDay: boolean
  humidity: number; windSpeed: number; daily: DailyForecast[]; updatedAt: number
}

export interface WeatherStorageSchema {
  schemaVersion: number; selectedCity: WeatherCity; cachedWeather?: WeatherData
}

export interface PhotoItem {
  id: string; name: string; filePath: string; createdAt: number
}

export interface PhotoWidgetSettings {
  intervalSeconds: number; fitMode: 'cover' | 'contain'; isPaused: boolean
}

export interface PhotoStorageSchema {
  schemaVersion: number; photos: PhotoItem[]; settings: PhotoWidgetSettings
}
