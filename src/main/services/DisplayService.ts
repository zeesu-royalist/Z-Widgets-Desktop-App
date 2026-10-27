import { screen, Rectangle, BrowserWindow } from 'electron'

export interface WidgetBounds { x: number; y: number; width: number; height: number }
export interface BoundsValidationResult { x: number; y: number; wasRecovered: boolean; displayId?: number }

let displayDebounceTimer: NodeJS.Timeout | null = null

function getIntersectionArea(r1: Rectangle, r2: Rectangle): number {
  const left = Math.max(r1.x, r2.x), right = Math.min(r1.x + r1.width, r2.x + r2.width)
  const top = Math.max(r1.y, r2.y), bottom = Math.min(r1.y + r1.height, r2.y + r2.height)
  return right > left && bottom > top ? (right - left) * (bottom - top) : 0
}

export function ensureVisibleBounds(bounds: WidgetBounds): BoundsValidationResult {
  const displays = screen.getAllDisplays()
  const rect: Rectangle = { x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.round(bounds.width), height: Math.round(bounds.height) }
  const area = rect.width * rect.height

  for (const d of displays) {
    if (area > 0 && getIntersectionArea(rect, d.workArea) / area >= 0.25) {
      return { x: rect.x, y: rect.y, wasRecovered: false, displayId: d.id }
    }
  }

  const primary = screen.getPrimaryDisplay()
  const wa = primary.workArea, margin = 24
  const maxX = wa.x + wa.width - rect.width - margin, maxY = wa.y + wa.height - rect.height - margin

  let safeX = rect.x >= wa.x && rect.x <= maxX ? rect.x : wa.x + margin
  let safeY = rect.y >= wa.y && rect.y <= maxY ? rect.y : wa.y + margin
  if (maxX <= wa.x + margin || maxY <= wa.y + margin) {
    safeX = wa.x + margin; safeY = wa.y + margin
  }

  return { x: safeX, y: safeY, wasRecovered: true, displayId: primary.id }
}

export function recoverOffscreenWindows(
  windows: Array<{ id: string; win: BrowserWindow }>
): { recoveredCount: number; affectedIds: string[] } {
  let recoveredCount = 0
  const affectedIds: string[] = []

  for (const { id, win } of windows) {
    if (win.isDestroyed()) continue
    const b = win.getBounds(), v = ensureVisibleBounds(b)
    if (v.wasRecovered) {
      win.setBounds({ x: v.x, y: v.y, width: b.width, height: b.height })
      recoveredCount++
      affectedIds.push(id)
      console.log(`[DISPLAY] Recovered orphaned widget "${id}" from off-screen to (${v.x}, ${v.y})`)
    }
  }
  return { recoveredCount, affectedIds }
}

export function initDisplayWatchers(onDisplaysChanged: () => void): void {
  const debounced = (): void => {
    if (displayDebounceTimer) clearTimeout(displayDebounceTimer)
    displayDebounceTimer = setTimeout(() => {
      displayDebounceTimer = null
      onDisplaysChanged()
    }, 300)
  }
  screen.on('display-added', debounced)
  screen.on('display-removed', debounced)
  screen.on('display-metrics-changed', debounced)
}
