import { ElectronAPI } from '@electron-toolkit/preload'
import { ZWidgetsAPI } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: ZWidgetsAPI
  }
}
