import { app } from 'electron'
import { join } from 'path'
import { promises as fs, existsSync, writeFileSync, renameSync } from 'fs'
import {
  WIDGET_STORAGE_FILENAME, SETTINGS_STORAGE_FILENAME, NOTES_STORAGE_FILENAME,
  TODO_STORAGE_FILENAME, WEATHER_STORAGE_FILENAME, PHOTO_STORAGE_FILENAME,
  WIDGET_STORAGE_SCHEMA_VERSION, SETTINGS_STORAGE_SCHEMA_VERSION, NOTES_STORAGE_SCHEMA_VERSION,
  TODO_STORAGE_SCHEMA_VERSION, WEATHER_STORAGE_SCHEMA_VERSION, PHOTO_STORAGE_SCHEMA_VERSION,
  DEV_TEST_WIDGET_ID, MIN_WIDGET_WIDTH, MAX_WIDGET_WIDTH, MIN_WIDGET_HEIGHT, MAX_WIDGET_HEIGHT
} from '../../shared/constants'
import {
  PersistedWidgetConfig, WidgetStorageSchema, AppSettingsSchema, NotesStorageSchema,
  NoteRecord, TodoItem, TodoStorageSchema, WeatherStorageSchema, WeatherCity,
  PhotoItem, PhotoWidgetSettings, PhotoStorageSchema, WidgetPlacementMode
} from '../../shared/types'

export const DEFAULT_PHOTO_SETTINGS: PhotoWidgetSettings = { intervalSeconds: 5, fitMode: 'cover', isPaused: false }
export const DEFAULT_WEATHER_CITY: WeatherCity = { id: 'city-delhi', name: 'New Delhi', country: 'India', latitude: 28.6139, longitude: 77.209 }

// In-memory schema caches
let cachedWidgetSchema: WidgetStorageSchema | null = null
let cachedSettingsSchema: AppSettingsSchema | null = null
let cachedNotesSchema: NotesStorageSchema | null = null
let cachedTodosSchema: TodoStorageSchema | null = null
let cachedWeatherSchema: WeatherStorageSchema | null = null
let cachedPhotoSchema: PhotoStorageSchema | null = null

const saveTimeouts: Record<string, NodeJS.Timeout | null> = {
  widget: null, note: null, todo: null, weather: null, photo: null
}

function getUserDataDir(): string {
  try { return app.getPath('userData') } catch { return process.cwd() }
}

const getPath = (filename: string): string => join(getUserDataDir(), filename)
export const getPhotosDir = (): string => join(getUserDataDir(), 'photos')
const getTempPath = (filePath: string): string => `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`
const isValidId = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id)

async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  const tempPath = getTempPath(filePath)
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8')
  await fs.rename(tempPath, filePath)
}

function atomicWriteJsonSync(filePath: string, data: unknown): void {
  const tempPath = getTempPath(filePath)
  writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8')
  renameSync(tempPath, filePath)
}

async function backupCorruptFile(filePath: string): Promise<void> {
  try { await fs.rename(filePath, `${filePath}.corrupt.${Date.now()}`) } catch {}
}

function scheduleSave(key: keyof typeof saveTimeouts, delay: number, saveFn: () => Promise<void>): void {
  if (saveTimeouts[key]) clearTimeout(saveTimeouts[key]!)
  saveTimeouts[key] = setTimeout(() => {
    saveTimeouts[key] = null
    saveFn().catch((err) => console.error(`[STORAGE] Failed to write ${key}:`, err))
  }, delay)
}

function syncFlushCache(filePath: string, data: unknown, label: string): void {
  if (data) {
    try { atomicWriteJsonSync(filePath, data) }
    catch (err) { console.error(`[STORAGE] Failed to sync flush ${label} to disk:`, err) }
  }
}

export function flushStorageSync(): void {
  for (const k of Object.keys(saveTimeouts)) {
    if (saveTimeouts[k]) { clearTimeout(saveTimeouts[k]!); saveTimeouts[k] = null }
  }
  const flushes: [string, unknown, string][] = [
    [WIDGET_STORAGE_FILENAME, cachedWidgetSchema, 'widgets'],
    [SETTINGS_STORAGE_FILENAME, cachedSettingsSchema, 'settings'],
    [NOTES_STORAGE_FILENAME, cachedNotesSchema, 'notes'],
    [TODO_STORAGE_FILENAME, cachedTodosSchema, 'todos'],
    [WEATHER_STORAGE_FILENAME, cachedWeatherSchema, 'weather'],
    [PHOTO_STORAGE_FILENAME, cachedPhotoSchema, 'photos']
  ]
  for (const [file, data, label] of flushes) syncFlushCache(getPath(file), data, label)
}

// Generic file loader with automatic corrupt-file recovery
async function loadJsonWithRecovery<T>(filename: string, fallback: T, parser: (raw: any) => T): Promise<T> {
  const filePath = getPath(filename)
  if (!existsSync(filePath)) return fallback
  try {
    const raw = JSON.parse(await fs.readFile(filePath, 'utf8'))
    return parser(raw)
  } catch (err) {
    console.warn(`[STORAGE] Corrupted or invalid storage file at "${filePath}". Creating clean backup:`, err)
    await backupCorruptFile(filePath)
    return fallback
  }
}

function validateWidgetRecord(item: unknown): PersistedWidgetConfig | null {
  if (!item || typeof item !== 'object') return null
  const r = item as Record<string, unknown>
  if (!isValidId(r.id) || r.id === DEV_TEST_WIDGET_ID) return null

  const placementMode: WidgetPlacementMode =
    r.placementMode === 'always-on-top' || r.placementMode === 'floating' || r.placementMode === 'desktop'
      ? r.placementMode : 'desktop'

  return {
    id: r.id,
    type: typeof r.type === 'string' && r.type ? r.type : 'standard',
    width: Math.max(MIN_WIDGET_WIDTH, Math.min(MAX_WIDGET_WIDTH, Math.round(Number(r.width) || 320))),
    height: Math.max(MIN_WIDGET_HEIGHT, Math.min(MAX_WIDGET_HEIGHT, Math.round(Number(r.height) || 200))),
    x: Number.isFinite(r.x) ? Math.round(Number(r.x)) : 100,
    y: Number.isFinite(r.y) ? Math.round(Number(r.y)) : 100,
    isVisible: typeof r.isVisible === 'boolean' ? r.isVisible : true,
    placementMode,
    settings: r.settings && typeof r.settings === 'object' ? (r.settings as Record<string, unknown>) : undefined,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now()
  }
}

export async function loadPersistedWidgets(): Promise<PersistedWidgetConfig[]> {
  const fallback = { schemaVersion: WIDGET_STORAGE_SCHEMA_VERSION, widgets: [] as PersistedWidgetConfig[] }
  const res = await loadJsonWithRecovery(WIDGET_STORAGE_FILENAME, fallback, (p) => ({
    schemaVersion: WIDGET_STORAGE_SCHEMA_VERSION,
    widgets: (Array.isArray(p?.widgets) ? p.widgets : []).map(validateWidgetRecord).filter(Boolean) as PersistedWidgetConfig[]
  }))
  cachedWidgetSchema = res
  return res.widgets
}

export function saveWidgetConfig(config: PersistedWidgetConfig): void {
  if (config.id === DEV_TEST_WIDGET_ID) return
  if (!cachedWidgetSchema) cachedWidgetSchema = { schemaVersion: WIDGET_STORAGE_SCHEMA_VERSION, widgets: [] }
  const idx = cachedWidgetSchema.widgets.findIndex((w) => w.id === config.id)
  const item = { ...config, updatedAt: Date.now() }
  if (idx !== -1) cachedWidgetSchema.widgets[idx] = item
  else cachedWidgetSchema.widgets.push(item)
  scheduleSave('widget', 250, () => atomicWriteJson(getPath(WIDGET_STORAGE_FILENAME), cachedWidgetSchema))
}

export function removeWidgetConfig(widgetId: string): void {
  if (!cachedWidgetSchema) return
  const prev = cachedWidgetSchema.widgets.length
  cachedWidgetSchema.widgets = cachedWidgetSchema.widgets.filter((w) => w.id !== widgetId)
  if (cachedWidgetSchema.widgets.length !== prev) {
    scheduleSave('widget', 250, () => atomicWriteJson(getPath(WIDGET_STORAGE_FILENAME), cachedWidgetSchema))
  }
}

export async function loadAppSettings(): Promise<AppSettingsSchema> {
  const def: AppSettingsSchema = { schemaVersion: SETTINGS_STORAGE_SCHEMA_VERSION, launchAtLogin: false, openAsHidden: false, theme: 'system' }
  const res = await loadJsonWithRecovery(SETTINGS_STORAGE_FILENAME, def, (p) => ({
    schemaVersion: SETTINGS_STORAGE_SCHEMA_VERSION,
    launchAtLogin: Boolean(p?.launchAtLogin),
    openAsHidden: Boolean(p?.openAsHidden),
    theme: p?.theme === 'light' || p?.theme === 'dark' ? p.theme : 'system'
  }))
  return (cachedSettingsSchema = res)
}

export async function saveAppSettings(settings: Partial<AppSettingsSchema>): Promise<void> {
  if (!cachedSettingsSchema) await loadAppSettings()
  cachedSettingsSchema = { ...cachedSettingsSchema!, ...settings, schemaVersion: SETTINGS_STORAGE_SCHEMA_VERSION }
  await atomicWriteJson(getPath(SETTINGS_STORAGE_FILENAME), cachedSettingsSchema)
}

export async function loadAllNotes(): Promise<NotesStorageSchema> {
  const def: NotesStorageSchema = { schemaVersion: NOTES_STORAGE_SCHEMA_VERSION, notes: {} }
  const res = await loadJsonWithRecovery(NOTES_STORAGE_FILENAME, def, (parsed) => {
    if (!parsed || typeof parsed !== 'object' || typeof parsed.notes !== 'object') throw new Error('Invalid notes structure')
    const valid: Record<string, NoteRecord> = {}
    for (const [key, val] of Object.entries(parsed.notes)) {
      if (isValidId(key) && val && typeof val === 'object') {
        const item = val as Record<string, unknown>
        valid[key] = {
          id: key,
          content: typeof item.content === 'string' ? item.content.slice(0, 500000) : '',
          updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now()
        }
      }
    }
    return { schemaVersion: NOTES_STORAGE_SCHEMA_VERSION, notes: valid }
  })
  return (cachedNotesSchema = res)
}

export async function loadNoteContent(noteId: string): Promise<string> {
  if (!isValidId(noteId)) return ''
  if (!cachedNotesSchema) await loadAllNotes()
  return cachedNotesSchema?.notes[noteId]?.content ?? ''
}

export function saveNoteContent(noteId: string, content: string): void {
  if (!isValidId(noteId)) return
  if (!cachedNotesSchema) cachedNotesSchema = { schemaVersion: NOTES_STORAGE_SCHEMA_VERSION, notes: {} }
  cachedNotesSchema.notes[noteId] = { id: noteId, content: typeof content === 'string' ? content.slice(0, 500000) : '', updatedAt: Date.now() }
  scheduleSave('note', 300, () => atomicWriteJson(getPath(NOTES_STORAGE_FILENAME), cachedNotesSchema))
}

function validateTodoItem(item: unknown): TodoItem | null {
  if (!item || typeof item !== 'object') return null
  const r = item as Record<string, unknown>
  if (!isValidId(r.id) || typeof r.text !== 'string') return null
  return {
    id: r.id,
    text: r.text.trim().slice(0, 500),
    completed: Boolean(r.completed),
    createdAt: typeof r.createdAt === 'number' && Number.isFinite(r.createdAt) ? r.createdAt : Date.now()
  }
}

export async function loadAllTodos(): Promise<TodoStorageSchema> {
  const def: TodoStorageSchema = { schemaVersion: TODO_STORAGE_SCHEMA_VERSION, todos: {} }
  const res = await loadJsonWithRecovery(TODO_STORAGE_FILENAME, def, (parsed) => {
    if (!parsed || typeof parsed !== 'object' || typeof parsed.todos !== 'object') throw new Error('Invalid todos structure')
    const valid: Record<string, TodoItem[]> = {}
    for (const [key, val] of Object.entries(parsed.todos)) {
      if (isValidId(key) && Array.isArray(val)) {
        valid[key] = val.map(validateTodoItem).filter(Boolean) as TodoItem[]
      }
    }
    return { schemaVersion: TODO_STORAGE_SCHEMA_VERSION, todos: valid }
  })
  return (cachedTodosSchema = res)
}

export async function loadTodos(widgetId: string): Promise<TodoItem[]> {
  if (!isValidId(widgetId)) return []
  if (!cachedTodosSchema) await loadAllTodos()
  return cachedTodosSchema?.todos[widgetId] ?? []
}

export function saveTodos(widgetId: string, todos: TodoItem[]): void {
  if (!isValidId(widgetId) || !Array.isArray(todos)) return
  if (!cachedTodosSchema) cachedTodosSchema = { schemaVersion: TODO_STORAGE_SCHEMA_VERSION, todos: {} }
  cachedTodosSchema.todos[widgetId] = todos.map(validateTodoItem).filter(Boolean) as TodoItem[]
  scheduleSave('todo', 300, () => atomicWriteJson(getPath(TODO_STORAGE_FILENAME), cachedTodosSchema))
}

export async function loadWeatherConfig(): Promise<WeatherStorageSchema> {
  if (cachedWeatherSchema) return cachedWeatherSchema
  const def: WeatherStorageSchema = { schemaVersion: WEATHER_STORAGE_SCHEMA_VERSION, selectedCity: DEFAULT_WEATHER_CITY }
  const res = await loadJsonWithRecovery(WEATHER_STORAGE_FILENAME, def, (p) => {
    const c = p?.selectedCity
    const validCity = c && typeof c.name === 'string' && typeof c.latitude === 'number' && typeof c.longitude === 'number'
    return { schemaVersion: WEATHER_STORAGE_SCHEMA_VERSION, selectedCity: validCity ? c : DEFAULT_WEATHER_CITY }
  })
  return (cachedWeatherSchema = res)
}

export function saveWeatherConfig(config: Partial<WeatherStorageSchema>): void {
  if (!cachedWeatherSchema) cachedWeatherSchema = { schemaVersion: WEATHER_STORAGE_SCHEMA_VERSION, selectedCity: DEFAULT_WEATHER_CITY }
  cachedWeatherSchema = { ...cachedWeatherSchema, ...config, schemaVersion: WEATHER_STORAGE_SCHEMA_VERSION }
  scheduleSave('weather', 250, () => atomicWriteJson(getPath(WEATHER_STORAGE_FILENAME), cachedWeatherSchema))
}

export async function loadPhotoStorage(): Promise<PhotoStorageSchema> {
  if (cachedPhotoSchema) return cachedPhotoSchema
  const def: PhotoStorageSchema = { schemaVersion: PHOTO_STORAGE_SCHEMA_VERSION, photos: [], settings: DEFAULT_PHOTO_SETTINGS }
  const res = await loadJsonWithRecovery(PHOTO_STORAGE_FILENAME, def, (p) => {
    const photos = Array.isArray(p?.photos) ? (p.photos.filter((i: any) => i && typeof i.id === 'string' && typeof i.filePath === 'string') as PhotoItem[]) : []
    const s = p?.settings
    return {
      schemaVersion: PHOTO_STORAGE_SCHEMA_VERSION,
      photos,
      settings: {
        intervalSeconds: typeof s?.intervalSeconds === 'number' ? s.intervalSeconds : 5,
        fitMode: (s?.fitMode === 'contain' ? 'contain' : 'cover') as 'cover' | 'contain',
        isPaused: Boolean(s?.isPaused)
      }
    }
  })
  return (cachedPhotoSchema = res)
}

export function savePhotoStorage(partial: Partial<PhotoStorageSchema>): void {
  if (!cachedPhotoSchema) cachedPhotoSchema = { schemaVersion: PHOTO_STORAGE_SCHEMA_VERSION, photos: [], settings: DEFAULT_PHOTO_SETTINGS }
  cachedPhotoSchema = { ...cachedPhotoSchema, ...partial, schemaVersion: PHOTO_STORAGE_SCHEMA_VERSION }
  scheduleSave('photo', 100, () => atomicWriteJson(getPath(PHOTO_STORAGE_FILENAME), cachedPhotoSchema))
}
