export const APP_NAME = 'Z-Widgets', APP_VERSION = '0.1.0'

export const DEFAULT_WINDOW_WIDTH = 980, DEFAULT_WINDOW_HEIGHT = 680
export const MIN_WINDOW_WIDTH = 800, MIN_WINDOW_HEIGHT = 560

export const DEFAULT_WIDGET_WIDTH = 320, DEFAULT_WIDGET_HEIGHT = 200
export const MIN_WIDGET_WIDTH = 140, MAX_WIDGET_WIDTH = 1200
export const MIN_WIDGET_HEIGHT = 80, MAX_WIDGET_HEIGHT = 900

export const DEV_TEST_WIDGET_ID = 'dev-test-widget'
export const DIGITAL_CLOCK_WIDGET_ID = 'digital-clock'
export const QUICK_NOTES_WIDGET_ID = 'quick-notes'
export const TODO_WIDGET_ID = 'todo-list'
export const SYSTEM_MONITOR_WIDGET_ID = 'system-monitor'
export const WEATHER_WIDGET_ID = 'weather-widget'
export const PHOTO_WIDGET_ID = 'photo-frame'
export const DEPTH_DIVE_WIDGET_ID = 'depth-dive-widget'
export const DUO_CALENDAR_WIDGET_ID = 'duo-calendar-widget'

export const WIDGET_TYPE_CLOCK = 'clock'
export const WIDGET_TYPE_NOTES = 'notes'
export const WIDGET_TYPE_TODO = 'todo'
export const WIDGET_TYPE_SYSTEM = 'system'
export const WIDGET_TYPE_WEATHER = 'weather'
export const WIDGET_TYPE_PHOTO = 'photo'
export const WIDGET_TYPE_TEST = 'test'
export const WIDGET_TYPE_DEPTH = 'depth'
export const WIDGET_TYPE_DUO = 'duo'
export const WIDGET_TYPE_STANDARD = 'standard'

export const WIDGET_STORAGE_SCHEMA_VERSION = 1
export const SETTINGS_STORAGE_SCHEMA_VERSION = 1
export const NOTES_STORAGE_SCHEMA_VERSION = 1
export const TODO_STORAGE_SCHEMA_VERSION = 1
export const WEATHER_STORAGE_SCHEMA_VERSION = 1
export const PHOTO_STORAGE_SCHEMA_VERSION = 1

export const WIDGET_STORAGE_FILENAME = 'widgets.json'
export const SETTINGS_STORAGE_FILENAME = 'settings.json'
export const NOTES_STORAGE_FILENAME = 'notes.json'
export const TODO_STORAGE_FILENAME = 'todos.json'
export const WEATHER_STORAGE_FILENAME = 'weather.json'
export const PHOTO_STORAGE_FILENAME = 'photos.json'

export const IPC_CHANNELS = {
  PING: 'app:ping',
  GET_APP_INFO: 'app:get-info',
  HIDE_MAIN_WINDOW: 'window:hide-main',
  SHOW_MAIN_WINDOW: 'window:show-main',
  TOGGLE_MAIN_WINDOW: 'window:toggle-main',
  CREATE_WIDGET_WINDOW: 'widget:create',
  CLOSE_WIDGET_WINDOW: 'widget:close',
  CLOSE_SELF_WIDGET: 'widget:close-self',
  HIDE_WIDGET_WINDOW: 'widget:hide',
  SHOW_WIDGET_WINDOW: 'widget:show',
  TOGGLE_WIDGET_WINDOW: 'widget:toggle',
  GET_ACTIVE_WIDGETS: 'widget:get-active',
  WIDGET_STATE_CHANGED: 'widget:state-changed',
  GET_STARTUP_SETTINGS: 'startup:get-settings',
  SET_STARTUP_SETTINGS: 'startup:set-settings',
  GET_PERSISTED_WIDGETS: 'widget:get-persisted',
  RECOVER_OFFSCREEN_WIDGETS: 'display:recover-widgets',
  GET_NOTE_CONTENT: 'notes:get-content',
  SAVE_NOTE_CONTENT: 'notes:save-content',
  GET_TODOS: 'todos:get-items',
  SAVE_TODOS: 'todos:save-items',
  GET_SYSTEM_STATS: 'system:get-stats',
  GET_WEATHER_DATA: 'weather:get-data',
  SET_WEATHER_CITY: 'weather:set-city',
  SEARCH_WEATHER_CITIES: 'weather:search-cities',
  PICK_PHOTOS: 'photos:pick',
  GET_PHOTOS: 'photos:get-all',
  GET_PHOTO_DATA: 'photos:get-data',
  REMOVE_PHOTO: 'photos:remove',
  SAVE_PHOTO_SETTINGS: 'photos:save-settings',
  GET_PHOTO_SETTINGS: 'photos:get-settings'
} as const
