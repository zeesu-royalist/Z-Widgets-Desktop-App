import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/constants'
import { AppInfo, WidgetWindowConfig, StartupSettings, PersistedWidgetConfig, TodoItem, SystemStats, WeatherData, WeatherCity, PhotoItem, PhotoWidgetSettings } from '../shared/types'

export interface ZWidgetsAPI {
  platform: string
  versions: { node: string; chrome: string; electron: string }
  isWidgetHost: boolean
  closeSelf?: () => Promise<boolean>
  getNoteContent?: (noteId: string) => Promise<string>
  saveNoteContent?: (noteId: string, content: string) => Promise<boolean>
  getTodos?: (widgetId: string) => Promise<TodoItem[]>
  saveTodos?: (widgetId: string, items: TodoItem[]) => Promise<boolean>
  getSystemStats?: () => Promise<SystemStats>
  getWeatherData?: (forceRefresh?: boolean) => Promise<WeatherData>
  setWeatherCity?: (city: WeatherCity) => Promise<WeatherData>
  searchWeatherCities?: (query: string) => Promise<WeatherCity[]>
  pickPhotos?: () => Promise<PhotoItem[]>
  getPhotos?: () => Promise<PhotoItem[]>
  getPhotoData?: (photoId: string) => Promise<string>
  removePhoto?: (photoId: string) => Promise<PhotoItem[]>
  savePhotoSettings?: (settings: Partial<PhotoWidgetSettings>) => Promise<PhotoWidgetSettings>
  getPhotoSettings?: () => Promise<PhotoWidgetSettings>
  ping?: () => Promise<string>
  getAppInfo?: () => Promise<AppInfo>
  hideWindow?: () => Promise<boolean>
  showWindow?: () => Promise<boolean>
  toggleWindow?: () => Promise<boolean>
  createWidget?: (config: WidgetWindowConfig) => Promise<boolean>
  closeWidget?: (id: string) => Promise<boolean>
  showWidget?: (id: string) => Promise<boolean>
  hideWidget?: (id: string) => Promise<boolean>
  toggleWidget?: (id: string) => Promise<boolean>
  getActiveWidgets?: () => Promise<string[]>
  onWidgetStateChanged?: (callback: (activeIds: string[]) => void) => () => void
  getStartupSettings?: () => Promise<StartupSettings>
  setStartupSettings?: (enabled: boolean) => Promise<StartupSettings>
  getPersistedWidgets?: () => Promise<PersistedWidgetConfig[]>
  recoverOffscreenWidgets?: () => Promise<{ recoveredCount: number; affectedIds: string[] }>
}

const isWidgetHost = typeof window !== 'undefined' && Boolean(window.location.hash?.startsWith('#/widget'))
const inv = <T = any>(ch: string, ...args: unknown[]): Promise<T> => ipcRenderer.invoke(ch, ...args)

const platformInfo = {
  platform: process.platform,
  versions: { node: process.versions.node, chrome: process.versions.chrome, electron: process.versions.electron }
}

const widgetDataApi = {
  getNoteContent: (id: string) => inv<string>(IPC_CHANNELS.GET_NOTE_CONTENT, id),
  saveNoteContent: (id: string, c: string) => inv<boolean>(IPC_CHANNELS.SAVE_NOTE_CONTENT, id, c),
  getTodos: (id: string) => inv<TodoItem[]>(IPC_CHANNELS.GET_TODOS, id),
  saveTodos: (id: string, items: TodoItem[]) => inv<boolean>(IPC_CHANNELS.SAVE_TODOS, id, items),
  getSystemStats: () => inv<SystemStats>(IPC_CHANNELS.GET_SYSTEM_STATS),
  getWeatherData: (ref?: boolean) => inv<WeatherData>(IPC_CHANNELS.GET_WEATHER_DATA, ref),
  setWeatherCity: (city: WeatherCity) => inv<WeatherData>(IPC_CHANNELS.SET_WEATHER_CITY, city),
  searchWeatherCities: (q: string) => inv<WeatherCity[]>(IPC_CHANNELS.SEARCH_WEATHER_CITIES, q),
  pickPhotos: () => inv<PhotoItem[]>(IPC_CHANNELS.PICK_PHOTOS),
  getPhotos: () => inv<PhotoItem[]>(IPC_CHANNELS.GET_PHOTOS),
  getPhotoData: (id: string) => inv<string>(IPC_CHANNELS.GET_PHOTO_DATA, id),
  removePhoto: (id: string) => inv<PhotoItem[]>(IPC_CHANNELS.REMOVE_PHOTO, id),
  savePhotoSettings: (s: Partial<PhotoWidgetSettings>) => inv<PhotoWidgetSettings>(IPC_CHANNELS.SAVE_PHOTO_SETTINGS, s),
  getPhotoSettings: () => inv<PhotoWidgetSettings>(IPC_CHANNELS.GET_PHOTO_SETTINGS)
}

const api: ZWidgetsAPI = {
  ...platformInfo,
  isWidgetHost,
  ...widgetDataApi,
  ...(isWidgetHost
    ? { closeSelf: () => inv<boolean>(IPC_CHANNELS.CLOSE_SELF_WIDGET) }
    : {
        ping: () => inv<string>(IPC_CHANNELS.PING),
        getAppInfo: () => inv<AppInfo>(IPC_CHANNELS.GET_APP_INFO),
        hideWindow: () => inv<boolean>(IPC_CHANNELS.HIDE_MAIN_WINDOW),
        showWindow: () => inv<boolean>(IPC_CHANNELS.SHOW_MAIN_WINDOW),
        toggleWindow: () => inv<boolean>(IPC_CHANNELS.TOGGLE_MAIN_WINDOW),
        createWidget: (c: WidgetWindowConfig) => inv<boolean>(IPC_CHANNELS.CREATE_WIDGET_WINDOW, c),
        closeWidget: (id: string) => inv<boolean>(IPC_CHANNELS.CLOSE_WIDGET_WINDOW, id),
        showWidget: (id: string) => inv<boolean>(IPC_CHANNELS.SHOW_WIDGET_WINDOW, id),
        hideWidget: (id: string) => inv<boolean>(IPC_CHANNELS.HIDE_WIDGET_WINDOW, id),
        toggleWidget: (id: string) => inv<boolean>(IPC_CHANNELS.TOGGLE_WIDGET_WINDOW, id),
        getActiveWidgets: () => inv<string[]>(IPC_CHANNELS.GET_ACTIVE_WIDGETS),
        onWidgetStateChanged: (cb: (ids: string[]) => void) => {
          const h = (_e: IpcRendererEvent, ids: string[]) => cb(ids)
          ipcRenderer.on(IPC_CHANNELS.WIDGET_STATE_CHANGED, h)
          return () => ipcRenderer.removeListener(IPC_CHANNELS.WIDGET_STATE_CHANGED, h)
        },
        getStartupSettings: () => inv<StartupSettings>(IPC_CHANNELS.GET_STARTUP_SETTINGS),
        setStartupSettings: (en: boolean) => inv<StartupSettings>(IPC_CHANNELS.SET_STARTUP_SETTINGS, en),
        getPersistedWidgets: () => inv<PersistedWidgetConfig[]>(IPC_CHANNELS.GET_PERSISTED_WIDGETS),
        recoverOffscreenWidgets: () => inv<{ recoveredCount: number; affectedIds: string[] }>(IPC_CHANNELS.RECOVER_OFFSCREEN_WIDGETS)
      })
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (e) {
    console.error('Failed to expose preload APIs to main world:', e)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
