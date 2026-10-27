import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import {
  DEFAULT_WIDGET_WIDTH, DEFAULT_WIDGET_HEIGHT, MIN_WIDGET_WIDTH, MAX_WIDGET_WIDTH,
  MIN_WIDGET_HEIGHT, MAX_WIDGET_HEIGHT, DEV_TEST_WIDGET_ID
} from '../../shared/constants'
import { WidgetPlacementMode, WidgetWindowConfig, ActiveWidgetInfo } from '../../shared/types'
import { saveWidgetConfig, removeWidgetConfig, loadPersistedWidgets } from './StorageService'
import { ensureVisibleBounds, recoverOffscreenWindows } from './DisplayService'

interface WidgetEntry { win: BrowserWindow; placement: WidgetPlacementMode; type: string }
const activeWidgets = new Map<string, WidgetEntry>()

type StateChangeListener = (activeIds: string[]) => void
const stateListeners = new Set<StateChangeListener>()

export function onWidgetStateChange(listener: StateChangeListener): () => void {
  stateListeners.add(listener)
  return () => { stateListeners.delete(listener) }
}

function emitStateChanged(): void {
  const currentIds = getActiveWidgetIds()
  stateListeners.forEach((fn) => { try { fn(currentIds) } catch (err) { console.error('[WIDGETS] Listener error:', err) } })
}

const isValidWidgetId = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id)

export function applyPlacementMode(win: BrowserWindow, mode: WidgetPlacementMode): void {
  const isMac = process.platform === 'darwin', isTop = mode === 'always-on-top'
  if (mode === 'floating') {
    win.setAlwaysOnTop(false)
    if (isMac) win.setVisibleOnAllWorkspaces(false)
  } else if (isTop) {
    win.setAlwaysOnTop(true, 'floating')
    if (isMac) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  } else {
    isMac ? win.setAlwaysOnTop(true, 'normal', -1) : win.setAlwaysOnTop(false)
    if (isMac) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })
  }
}

function persistState(id: string, win: BrowserWindow, isVisible: boolean, settings?: Record<string, unknown>): void {
  if (id === DEV_TEST_WIDGET_ID || win.isDestroyed()) return
  const b = win.getBounds(), entry = activeWidgets.get(id)
  saveWidgetConfig({
    id, type: entry?.type || 'standard',
    width: b.width, height: b.height, x: b.x, y: b.y,
    isVisible, placementMode: entry?.placement || 'desktop',
    settings, updatedAt: Date.now()
  })
}

export function createWidgetWindow(config: WidgetWindowConfig): BrowserWindow {
  if (!isValidWidgetId(config.id)) throw new Error(`Invalid widget ID "${config.id}".`)

  const existing = getWidgetWindow(config.id)
  if (existing) {
    if (existing.isMinimized()) existing.restore()
    activeWidgets.get(config.id)?.placement === 'desktop' ? existing.showInactive() : existing.show()
    return existing
  }

  const width = Math.max(MIN_WIDGET_WIDTH, Math.min(MAX_WIDGET_WIDTH, Math.round(config.width || DEFAULT_WIDGET_WIDTH)))
  const height = Math.max(MIN_WIDGET_HEIGHT, Math.min(MAX_WIDGET_HEIGHT, Math.round(config.height || DEFAULT_WIDGET_HEIGHT)))
  const coord = (v: unknown) => Number.isFinite(v) ? Math.round(Number(v)) : 100
  const bounds = ensureVisibleBounds({ x: coord(config.x), y: coord(config.y), width, height })

  const placement = config.placementMode || 'desktop', type = config.type || 'standard'
  const win = new BrowserWindow({
    width, height, x: bounds.x, y: bounds.y,
    frame: false, transparent: true, resizable: false, minimizable: false,
    maximizable: false, fullscreenable: false, show: false, backgroundColor: '#00000000',
    hasShadow: false, skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false
    }
  })

  applyPlacementMode(win, placement)
  activeWidgets.set(config.id, { win, placement, type })

  if (config.id !== DEV_TEST_WIDGET_ID) persistState(config.id, win, config.isVisible !== false, config.settings)

  const onUpdate = (): void => persistState(config.id, win, win.isVisible(), config.settings)
  win.on('moved', onUpdate).on('resized', onUpdate)

  win.on('ready-to-show', () => {
    if (config.isVisible !== false) (placement === 'desktop' ? win.showInactive() : win.show())
    emitStateChanged()
  })

  win.on('closed', () => {
    if (activeWidgets.has(config.id)) {
      activeWidgets.delete(config.id)
      removeWidgetConfig(config.id)
      emitStateChanged()
    }
  })

  win.webContents.setWindowOpenHandler((d) => { shell.openExternal(d.url); return { action: 'deny' } })
  win.webContents.on('will-navigate', (e, u) => {
    if (u !== win.webContents.getURL()) { e.preventDefault(); shell.openExternal(u) }
  })

  const hash = `/widget/${encodeURIComponent(config.id)}?type=${encodeURIComponent(type)}`
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${hash}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }

  emitStateChanged()
  return win
}

export function getWidgetWindow(id: string): BrowserWindow | null {
  const entry = activeWidgets.get(id)
  if (entry && !entry.win.isDestroyed()) return entry.win
  if (entry) activeWidgets.delete(id)
  return null
}

export function getWidgetIdByWebContentsId(webContentsId: number): string | null {
  for (const [id, { win }] of activeWidgets.entries()) {
    if (!win.isDestroyed() && win.webContents.id === webContentsId) return id
  }
  return null
}

export function showWidgetWindow(id: string): boolean {
  const win = getWidgetWindow(id)
  if (!win) return false
  if (!win.isVisible()) {
    activeWidgets.get(id)?.placement === 'desktop' ? win.showInactive() : win.show()
    persistState(id, win, true)
    emitStateChanged()
  }
  return true
}

export function hideWidgetWindow(id: string): boolean {
  const win = getWidgetWindow(id)
  if (!win?.isVisible()) return false
  win.hide()
  persistState(id, win, false)
  emitStateChanged()
  return true
}

export function toggleWidgetWindow(id: string): boolean {
  const win = getWidgetWindow(id)
  return win ? (win.isVisible() ? hideWidgetWindow(id) : showWidgetWindow(id)) : false
}

export function closeWidgetWindow(id: string): boolean {
  const win = getWidgetWindow(id)
  if (win && !win.isDestroyed()) {
    activeWidgets.delete(id)
    removeWidgetConfig(id)
    win.close()
    emitStateChanged()
    return true
  }
  return false
}

export function closeAllWidgetWindows(): void {
  const entries = Array.from(activeWidgets.values())
  activeWidgets.clear()
  for (const { win } of entries) {
    if (!win.isDestroyed()) win.close()
  }
  emitStateChanged()
}

export function getActiveWidgetIds(): string[] {
  const ids: string[] = []
  for (const [id, { win }] of activeWidgets.entries()) {
    if (!win.isDestroyed()) ids.push(id)
    else activeWidgets.delete(id)
  }
  return ids
}

export const getActiveWidgetCount = (): number => getActiveWidgetIds().length

export function getActiveWidgetInfos(): ActiveWidgetInfo[] {
  return getActiveWidgetIds().map((id) => {
    const { win, type, placement } = activeWidgets.get(id)!
    const b = win.getBounds()
    return {
      id, type, isVisible: win.isVisible(),
      width: b.width, height: b.height, x: b.x, y: b.y,
      placementMode: placement
    }
  })
}

export async function restorePersistedWidgets(): Promise<number> {
  const saved = await loadPersistedWidgets()
  let count = 0
  for (const s of saved) {
    if (activeWidgets.has(s.id) || s.id === DEV_TEST_WIDGET_ID) continue
    try {
      createWidgetWindow(s)
      count++
    } catch (err) {
      console.warn(`[WIDGETS] Failed to restore "${s.id}":`, err)
    }
  }
  return count
}

export function recoverActiveWidgets(): { recoveredCount: number; affectedIds: string[] } {
  return recoverOffscreenWindows(Array.from(activeWidgets.entries()).map(([id, { win }]) => ({ id, win })))
}
