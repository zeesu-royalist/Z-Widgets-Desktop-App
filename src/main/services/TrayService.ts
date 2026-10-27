import { app, Tray, Menu, MenuItemConstructorOptions, nativeImage, NativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { is } from '@electron-toolkit/utils'

let trayInstance: Tray | null = null

export interface TrayCallbacks {
  onOpen: () => void
  onHide: () => void
  onQuit: () => void
  onToggleTestWidget?: () => void
}

function getTrayIcon(): NativeImage {
  const paths = [
    join(__dirname, '../../resources/trayTemplate.png'),
    join(app.getAppPath(), 'resources/trayTemplate.png'),
    join(process.cwd(), 'resources/trayTemplate.png'),
    join(process.resourcesPath, 'trayTemplate.png'),
    join(process.resourcesPath, 'resources/trayTemplate.png')
  ]
  let img: NativeImage | null = null
  for (const p of paths) {
    if (existsSync(p)) {
      const i = nativeImage.createFromPath(p)
      if (!i.isEmpty()) { img = i; break }
    }
  }
  if (!img || img.isEmpty()) {
    img = nativeImage.createFromBuffer(Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVR4nGNgGFjAiM+8////f6b/jEwM+MQY0AWhGBmY8JmD12xCJvCbhsswXAFxGgYAAH7+DR/7J8JjAAAAAElFTkSuQmCC',
      'base64'
    ))
  }
  if (process.platform === 'darwin') img.setTemplateImage(true)
  return img
}

export function initTray(callbacks: TrayCallbacks): Tray {
  if (trayInstance) { trayInstance.destroy(); trayInstance = null }

  const tray = new Tray(getTrayIcon())
  tray.setToolTip('Z-Widgets')

  const menu: MenuItemConstructorOptions[] = [
    { label: 'Open Z-Widgets', click: () => callbacks.onOpen() },
    { label: 'Hide Window', click: () => callbacks.onHide() }
  ]
  if (is.dev && callbacks.onToggleTestWidget) {
    menu.push({ type: 'separator' }, { label: 'Toggle Test Widget (Dev)', click: () => callbacks.onToggleTestWidget?.() })
  }
  menu.push({ type: 'separator' }, { label: 'Quit Z-Widgets', click: () => callbacks.onQuit() })

  tray.setContextMenu(Menu.buildFromTemplate(menu))
  tray.on('click', () => callbacks.onOpen())
  tray.on('double-click', () => callbacks.onOpen())
  return (trayInstance = tray)
}

export const getTray = (): Tray | null => trayInstance
export function destroyTray(): void {
  if (trayInstance) { trayInstance.destroy(); trayInstance = null }
}
