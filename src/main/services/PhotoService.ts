import { dialog, BrowserWindow } from 'electron'
import { promises as fs, existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { PhotoItem, PhotoWidgetSettings } from '../../shared/types'
import { loadPhotoStorage, savePhotoStorage, getPhotosDir, DEFAULT_PHOTO_SETTINGS } from './StorageService'

const DEFAULT_SAMPLE_PHOTOS: PhotoItem[] = [
  { id: 'sample-nature-1', name: 'Mountain Lake Vista', filePath: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80', createdAt: 1000 },
  { id: 'sample-nature-2', name: 'Misty Alpine Forest', filePath: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80', createdAt: 2000 },
  { id: 'sample-nature-3', name: 'Golden Foggy Ridge', filePath: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80', createdAt: 3000 }
]

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.bmp': 'image/bmp'
}
const getMimeType = (p: string) => MIME_MAP[extname(p).toLowerCase()] || 'image/jpeg'

export async function getPhotos(): Promise<PhotoItem[]> {
  const s = await loadPhotoStorage()
  if (!s.photos?.length) {
    savePhotoStorage({ photos: DEFAULT_SAMPLE_PHOTOS })
    return DEFAULT_SAMPLE_PHOTOS
  }
  return s.photos
}

export async function pickPhotos(parentWindow?: BrowserWindow | null): Promise<PhotoItem[]> {
  const opts = {
    title: 'Select Photos for Z-Widgets', buttonLabel: 'Add to Widget',
    properties: ['openFile', 'multiSelections'] as ('openFile' | 'multiSelections')[],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'] }]
  }
  const result = await (parentWindow ? dialog.showOpenDialog(parentWindow, opts) : dialog.showOpenDialog(opts))
  if (result.canceled || !result.filePaths?.length) return getPhotos()

  const photosDir = getPhotosDir()
  await fs.mkdir(photosDir, { recursive: true })
  const storage = await loadPhotoStorage()
  const existing = storage.photos.filter((p) => !p.id.startsWith('sample-'))
  const newItems: PhotoItem[] = []

  for (const src of result.filePaths) {
    try {
      const ext = extname(src), id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const dest = join(photosDir, `${id}${ext}`)
      await fs.copyFile(src, dest)
      newItems.push({ id, name: basename(src), filePath: dest, createdAt: Date.now() })
    } catch (err) {
      console.error(`[PHOTO] Failed to import photo from ${src}:`, err)
    }
  }

  const combined = [...existing, ...newItems]
  savePhotoStorage({ photos: combined })
  return combined
}

export async function getPhotoData(photoId: string): Promise<string> {
  const s = await loadPhotoStorage()
  const photo = s.photos.find((p) => p.id === photoId)
  if (!photo) return ''
  if (photo.filePath.startsWith('http://') || photo.filePath.startsWith('https://')) return photo.filePath
  if (!existsSync(photo.filePath)) return ''
  try {
    const buffer = await fs.readFile(photo.filePath)
    return `data:${getMimeType(photo.filePath)};base64,${buffer.toString('base64')}`
  } catch (err) {
    console.error(`[PHOTO] Failed to read buffer for ${photoId}:`, err)
    return ''
  }
}

export async function removePhoto(photoId: string): Promise<PhotoItem[]> {
  const s = await loadPhotoStorage()
  const photo = s.photos.find((p) => p.id === photoId)
  if (photo && !photo.filePath.startsWith('http') && existsSync(photo.filePath)) {
    try { await fs.unlink(photo.filePath) } catch {}
  }
  const updated = s.photos.filter((p) => p.id !== photoId)
  savePhotoStorage({ photos: updated })
  return updated
}

export async function getPhotoSettings(): Promise<PhotoWidgetSettings> {
  const s = await loadPhotoStorage()
  return s.settings || DEFAULT_PHOTO_SETTINGS
}

export async function savePhotoSettings(settings: Partial<PhotoWidgetSettings>): Promise<PhotoWidgetSettings> {
  const s = await loadPhotoStorage()
  const c = s.settings || DEFAULT_PHOTO_SETTINGS
  const updated: PhotoWidgetSettings = {
    intervalSeconds: Number(settings.intervalSeconds) || c.intervalSeconds,
    fitMode: settings.fitMode === 'contain' ? 'contain' : 'cover',
    isPaused: settings.isPaused !== undefined ? Boolean(settings.isPaused) : c.isPaused
  }
  savePhotoStorage({ settings: updated })
  return updated
}
