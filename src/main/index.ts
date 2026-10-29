import { app, ipcMain, IpcMainInvokeEvent, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { is, electronApp, optimizer } from '@electron-toolkit/utils'
import {
  APP_NAME, APP_VERSION, IPC_CHANNELS, DEV_TEST_WIDGET_ID,
  DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT, MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT
} from '../shared/constants'
import { AppInfo, Platform, WidgetWindowConfig, StartupSettings, WeatherCity, PhotoWidgetSettings } from '../shared/types'
import { initTray, destroyTray } from './services/TrayService'
import {
  createWidgetWindow, closeWidgetWindow, hideWidgetWindow, showWidgetWindow,
  toggleWidgetWindow, getActiveWidgetIds, getActiveWidgetCount, closeAllWidgetWindows,
  onWidgetStateChange, getWidgetIdByWebContentsId, restorePersistedWidgets, recoverActiveWidgets
} from './services/WidgetWindowManager'
import { flushStorageSync, loadPersistedWidgets, loadNoteContent, saveNoteContent, loadTodos, saveTodos } from './services/StorageService'
import { initDisplayWatchers } from './services/DisplayService'
import { getStartupSettings, setStartupSettings } from './services/StartupService'
import { getSystemStats } from './services/SystemService'
import { getWeatherData, setWeatherCity, searchWeatherCities } from './services/WeatherService'
import {
  pickPhotos, getPhotos, getPhotoData, removePhoto, savePhotoSettings, getPhotoSettings
} from './services/PhotoService'

// --- Main Window Lifecycle ---
let mainWindow: BrowserWindow | null = null
let isQuitting = false

export const setIsQuitting = (q: boolean): void => { isQuitting = q }
export const getIsQuitting = (): boolean => isQuitting
export const getMainWindow = (): BrowserWindow | null => (mainWindow && !mainWindow.isDestroyed() ? mainWindow : null)

export function createMainWindow(): BrowserWindow {
  const existing = getMainWindow()
  if (existing) {
    if (existing.isMinimized()) existing.restore()
    existing.show()
    existing.focus()
    return existing
  }

  const iconPath = join(__dirname, '../../resources/icon.png')
  const safeIcon = existsSync(iconPath) ? iconPath : undefined
  const win = new BrowserWindow({
    width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT,
    minWidth: MIN_WINDOW_WIDTH, minHeight: MIN_WINDOW_HEIGHT,
    title: APP_NAME, show: false, autoHideMenuBar: true, backgroundColor: '#0a0a0c',
    icon: safeIcon,
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 16, y: 16 }, vibrancy: 'under-window' } : {}),
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false, contextIsolation: true, nodeIntegration: false }
  })

  mainWindow = win
  win.once('ready-to-show', () => { win.show(); win.focus() })
  win.webContents.on('did-finish-load', () => {
    if (!win.isVisible()) { win.show(); win.focus() }
  })
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show()
      mainWindow.focus()
    }
  }, 1000)
  win.on('close', (e) => { if (!isQuitting) { e.preventDefault(); win.hide() } })
  win.on('closed', () => { mainWindow = null })
  win.webContents.setWindowOpenHandler((d) => { shell.openExternal(d.url); return { action: 'deny' } })
  win.webContents.on('will-navigate', (e, u) => {
    if (u !== win.webContents.getURL()) { e.preventDefault(); shell.openExternal(u) }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

export function showMainWindow(): void {
  const win = getMainWindow()
  if (!win) { createMainWindow(); return }
  if (win.isMinimized()) win.restore()
  if (!win.isVisible()) win.show()
  win.focus()
}

export function hideMainWindow(): void { getMainWindow()?.hide() }
export function toggleMainWindow(): void { getMainWindow()?.isVisible() ? hideMainWindow() : showMainWindow() }

// --- Security & IPC Validation ---
const isMain = (e: IpcMainInvokeEvent): boolean => {
  const w = getMainWindow()
  return Boolean(w && !w.isDestroyed() && w.webContents.id === e.sender.id)
}
const getSenderId = (e: IpcMainInvokeEvent): string | null => getWidgetIdByWebContentsId(e.sender.id)
const isAuthorized = (e: IpcMainInvokeEvent, targetId?: string): boolean =>
  isMain(e) || (targetId ? getSenderId(e) === targetId : Boolean(getSenderId(e)))
const isValidId = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id)

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PING, async () => 'pong')
  ipcMain.handle(IPC_CHANNELS.GET_APP_INFO, async (): Promise<AppInfo> => ({
    name: APP_NAME, version: APP_VERSION, platform: process.platform as Platform,
    electronVersion: process.versions.electron, chromeVersion: process.versions.chrome, nodeVersion: process.versions.node
  }))

  ipcMain.handle(IPC_CHANNELS.HIDE_MAIN_WINDOW, async (e) => isMain(e) ? (hideMainWindow(), true) : false)
  ipcMain.handle(IPC_CHANNELS.SHOW_MAIN_WINDOW, async (e) => isMain(e) ? (showMainWindow(), true) : false)
  ipcMain.handle(IPC_CHANNELS.TOGGLE_MAIN_WINDOW, async (e) => isMain(e) ? (toggleMainWindow(), true) : false)

  ipcMain.handle(IPC_CHANNELS.GET_STARTUP_SETTINGS, async (e): Promise<StartupSettings> => {
    if (!isMain(e)) throw new Error('Unauthorized')
    return getStartupSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SET_STARTUP_SETTINGS, async (e, enabled: unknown): Promise<StartupSettings> => {
    if (!isMain(e)) throw new Error('Unauthorized')
    if (typeof enabled !== 'boolean') throw new Error('Invalid enabled parameter: must be a boolean')
    return setStartupSettings(enabled)
  })

  ipcMain.handle(IPC_CHANNELS.GET_PERSISTED_WIDGETS, async (e) => isMain(e) ? loadPersistedWidgets() : [])
  ipcMain.handle(IPC_CHANNELS.RECOVER_OFFSCREEN_WIDGETS, async (e) =>
    isMain(e) ? recoverActiveWidgets() : { recoveredCount: 0, affectedIds: [] }
  )

  ipcMain.handle(IPC_CHANNELS.CREATE_WIDGET_WINDOW, async (e, config: WidgetWindowConfig): Promise<boolean> => {
    if (!isMain(e)) throw new Error('Unauthorized')
    if (!config?.id) throw new Error('Invalid widget config')
    createWidgetWindow(config)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.CLOSE_WIDGET_WINDOW, async (e, id: string) => typeof id === 'string' && isAuthorized(e, id) ? closeWidgetWindow(id) : false)
  ipcMain.handle(IPC_CHANNELS.CLOSE_SELF_WIDGET, async (e) => {
    const sId = getSenderId(e)
    return sId ? closeWidgetWindow(sId) : false
  })

  ipcMain.handle(IPC_CHANNELS.HIDE_WIDGET_WINDOW, async (e, id: string) => typeof id === 'string' && isAuthorized(e, id) ? hideWidgetWindow(id) : false)
  ipcMain.handle(IPC_CHANNELS.SHOW_WIDGET_WINDOW, async (e, id: string) => typeof id === 'string' && isMain(e) ? showWidgetWindow(id) : false)
  ipcMain.handle(IPC_CHANNELS.TOGGLE_WIDGET_WINDOW, async (e, id: string) => typeof id === 'string' && isAuthorized(e, id) ? toggleWidgetWindow(id) : false)
  ipcMain.handle(IPC_CHANNELS.GET_ACTIVE_WIDGETS, async (e) => isMain(e) ? getActiveWidgetIds() : [])

  ipcMain.handle(IPC_CHANNELS.GET_NOTE_CONTENT, async (e, noteId: unknown) => isValidId(noteId) && isAuthorized(e, noteId) ? loadNoteContent(noteId) : '')
  ipcMain.handle(IPC_CHANNELS.SAVE_NOTE_CONTENT, async (e, noteId: unknown, content: unknown) => {
    if (!isValidId(noteId) || typeof content !== 'string' || !isAuthorized(e, noteId)) return false
    saveNoteContent(noteId, content)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.GET_TODOS, async (e, widgetId: unknown) => isValidId(widgetId) && isAuthorized(e, widgetId) ? loadTodos(widgetId) : [])
  ipcMain.handle(IPC_CHANNELS.SAVE_TODOS, async (e, widgetId: unknown, items: unknown) => {
    if (!isValidId(widgetId) || !Array.isArray(items) || !isAuthorized(e, widgetId)) return false
    saveTodos(widgetId, items)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.GET_SYSTEM_STATS, async (e) => {
    if (!isAuthorized(e)) return { cpuUsage: 0, cpuModel: '', cpuCores: 1, totalMemGB: 0, usedMemGB: 0, freeMemGB: 0, memUsage: 0, uptimeFormatted: '0m', platform: process.platform as Platform }
    return getSystemStats()
  })

  ipcMain.handle(IPC_CHANNELS.GET_WEATHER_DATA, async (e, forceRefresh: unknown) => {
    if (!isAuthorized(e)) throw new Error('Unauthorized')
    return getWeatherData(Boolean(forceRefresh))
  })

  ipcMain.handle(IPC_CHANNELS.SET_WEATHER_CITY, async (e, city: unknown) => {
    if (!isAuthorized(e)) throw new Error('Unauthorized')
    const c = city as WeatherCity
    if (!c?.name || typeof c.latitude !== 'number' || typeof c.longitude !== 'number') throw new Error('Invalid city')
    return setWeatherCity(c)
  })

  ipcMain.handle(IPC_CHANNELS.SEARCH_WEATHER_CITIES, async (e, query: unknown) => typeof query === 'string' && isAuthorized(e) ? searchWeatherCities(query) : [])
  ipcMain.handle(IPC_CHANNELS.PICK_PHOTOS, async (e) => isAuthorized(e) ? pickPhotos(BrowserWindow.fromWebContents(e.sender)) : [])
  ipcMain.handle(IPC_CHANNELS.GET_PHOTOS, async (e) => isAuthorized(e) ? getPhotos() : [])
  ipcMain.handle(IPC_CHANNELS.GET_PHOTO_DATA, async (e, id: unknown) => typeof id === 'string' && isAuthorized(e) ? getPhotoData(id) : '')
  ipcMain.handle(IPC_CHANNELS.REMOVE_PHOTO, async (e, id: unknown) => typeof id === 'string' && isAuthorized(e) ? removePhoto(id) : [])
  ipcMain.handle(IPC_CHANNELS.SAVE_PHOTO_SETTINGS, async (e, s: unknown) => isAuthorized(e) ? savePhotoSettings((s || {}) as Partial<PhotoWidgetSettings>) : null)
  ipcMain.handle(IPC_CHANNELS.GET_PHOTO_SETTINGS, async (e) => isAuthorized(e) ? getPhotoSettings() : null)
}

app.name = APP_NAME

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox')
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showMainWindow())

  app.whenReady().then(() => {
    try {
      electronApp.setAppUserModelId('com.zwidgets.app')
      if (is.dev && process.platform === 'darwin' && app.dock) {
        const devIconPath = join(__dirname, '../../resources/icon.png')
        if (existsSync(devIconPath)) {
          try { app.dock.setIcon(devIconPath) } catch { }
        }
      }
      app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

      registerIpcHandlers()
      createMainWindow()
      initDisplayWatchers(() => recoverActiveWidgets())
      restorePersistedWidgets().catch((err) => console.warn('[STARTUP] Failed to restore saved widgets:', err))

      onWidgetStateChange((activeIds) => {
        const mainWin = getMainWindow()
        if (mainWin && !mainWin.isDestroyed()) {
          mainWin.webContents.send(IPC_CHANNELS.WIDGET_STATE_CHANGED, activeIds)
        }
      })

      initTray({
        onOpen: () => showMainWindow(),
        onHide: () => hideMainWindow(),
        onQuit: () => {
          setIsQuitting(true)
          closeAllWidgetWindows()
          flushStorageSync()
          destroyTray()
          app.quit()
        },
        onToggleTestWidget: () => {
          getActiveWidgetIds().includes(DEV_TEST_WIDGET_ID)
            ? toggleWidgetWindow(DEV_TEST_WIDGET_ID)
            : createWidgetWindow({ id: DEV_TEST_WIDGET_ID, title: 'Test Widget Host', width: 320, height: 180, placementMode: 'desktop' })
        }
      })

      app.on('activate', () => showMainWindow())
    } catch (err) {
      console.error('[FATAL STARTUP ERROR]', err)
      createMainWindow()
    }
  }).catch((err) => {
    console.error('[WHEN_READY FATAL ERROR]', err)
  })

  app.on('before-quit', (event) => {
    if (!getIsQuitting() && getActiveWidgetCount() > 0) {
      event.preventDefault()
      hideMainWindow()
      return
    }
    setIsQuitting(true)
    closeAllWidgetWindows()
    flushStorageSync()
  })

  app.on('window-all-closed', () => { })
}
