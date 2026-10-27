import { app } from 'electron'
import { StartupSettings } from '../../shared/types'
import { loadAppSettings, saveAppSettings } from './StorageService'

export const isStartupSupported = (): boolean =>
  process.platform === 'darwin' || process.platform === 'win32' || process.platform === 'linux'

export async function getStartupSettings(): Promise<StartupSettings> {
  const isSupported = isStartupSupported(), isPackaged = app.isPackaged
  if (!isSupported) return { openAtLogin: false, openAsHidden: false, isSupported: false, isPackaged }

  const appSettings = await loadAppSettings()
  if (isPackaged) {
    try {
      const osSettings = app.getLoginItemSettings()
      return { openAtLogin: osSettings.openAtLogin, openAsHidden: Boolean(osSettings.wasOpenedAsHidden || appSettings.openAsHidden), isSupported: true, isPackaged }
    } catch (err) {
      console.warn('[STARTUP] Failed to query OS login item settings:', err)
    }
  }
  return { openAtLogin: appSettings.launchAtLogin, openAsHidden: appSettings.openAsHidden, isSupported: true, isPackaged }
}

export async function setStartupSettings(enabled: boolean, openAsHidden: boolean = true): Promise<StartupSettings> {
  if (!isStartupSupported()) throw new Error(`Startup on login is not supported on platform "${process.platform}"`)
  await saveAppSettings({ launchAtLogin: enabled, openAsHidden })

  if (app.isPackaged) {
    try { app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden, args: ['--hidden'] }) }
    catch (err) { console.error('[STARTUP] Failed to apply OS login item settings:', err); throw err }
  } else {
    console.log(`[STARTUP] Development mode: persisted launchAtLogin=${enabled} without registering raw dev binary in OS`)
  }
  return { openAtLogin: enabled, openAsHidden, isSupported: true, isPackaged: app.isPackaged }
}
