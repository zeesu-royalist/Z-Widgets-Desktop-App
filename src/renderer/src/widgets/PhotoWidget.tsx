import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Image as ImageIcon, Plus, Play, Pause, ChevronLeft, ChevronRight,
  Trash2, X, Maximize2, Minimize2, Loader2, Clock
} from 'lucide-react'
import { PhotoItem, PhotoWidgetSettings } from '../../../shared/types'

interface PhotoWidgetProps {
  widgetId: string
  onClose?: () => Promise<void>
}

const INTERVAL_OPTIONS = [
  { label: '3s', value: 3 }, { label: '5s', value: 5 }, { label: '10s', value: 10 },
  { label: '30s', value: 30 }, { label: '1m', value: 60 }, { label: '5m', value: 300 }
]

export const PhotoWidget: React.FC<PhotoWidgetProps> = ({ widgetId, onClose }) => {
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [currentPhotoData, setCurrentPhotoData] = useState<string>('')
  const [prevPhotoData, setPrevPhotoData] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false)
  const [transitionKey, setTransitionKey] = useState<number>(0)

  const [settings, setSettings] = useState<PhotoWidgetSettings>({ intervalSeconds: 5, fitMode: 'cover', isPaused: false })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isHovered, setIsHovered] = useState<boolean>(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false)

  const imageCacheRef = useRef<Map<string, string>>(new Map())
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null)

  const loadPhotoSrc = useCallback(async (photo: PhotoItem): Promise<string> => {
    if (imageCacheRef.current.has(photo.id)) return imageCacheRef.current.get(photo.id)!
    if (photo.filePath.startsWith('http')) {
      imageCacheRef.current.set(photo.id, photo.filePath)
      return photo.filePath
    }
    try {
      const dataUrl = await window.api?.getPhotoData?.(photo.id)
      if (dataUrl) { imageCacheRef.current.set(photo.id, dataUrl); return dataUrl }
    } catch (err) {
      console.warn('[PHOTO_WIDGET] Failed to load photo data:', err)
    }
    return ''
  }, [])

  useEffect(() => {
    let isMounted = true
    const initialize = async (): Promise<void> => {
      try {
        const [s, list] = await Promise.all([window.api?.getPhotoSettings?.(), window.api?.getPhotos?.()])
        if (!isMounted) return
        if (s) setSettings(s)
        if (list) {
          setPhotos(list)
          setIsLoading(false)
          list.forEach((p) => loadPhotoSrc(p))
        }
      } catch (err) {
        console.warn('[PHOTO_WIDGET] Failed to initialize:', err)
        if (isMounted) setIsLoading(false)
      }
    }
    initialize()
    return () => {
      isMounted = false
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    }
  }, [loadPhotoSrc])

  useEffect(() => {
    let isMounted = true
    if (photos.length === 0) { setCurrentPhotoData(''); setPrevPhotoData(null); return }

    const safeIndex = Math.min(currentIndex, photos.length - 1)
    const activePhoto = photos[safeIndex]
    if (!activePhoto) return

    loadPhotoSrc(activePhoto).then((nextSrc) => {
      if (!isMounted || !nextSrc) return
      setCurrentPhotoData((currentActive) => {
        if (!currentActive || currentActive === nextSrc) return nextSrc
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)

        setPrevPhotoData(currentActive)
        setIsTransitioning(true)
        setTransitionKey((k) => k + 1)

        transitionTimerRef.current = setTimeout(() => {
          if (isMounted) { setPrevPhotoData(null); setIsTransitioning(false) }
        }, 1150)
        return nextSrc
      })
    })

    if (photos.length > 1) {
      const nextPhoto = photos[(safeIndex + 1) % photos.length]
      if (nextPhoto) loadPhotoSrc(nextPhoto)
    }
    return () => { isMounted = false }
  }, [currentIndex, photos, loadPhotoSrc])

  useEffect(() => {
    if (settings.isPaused || photos.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length)
    }, Math.max(2, settings.intervalSeconds) * 1000)
    return () => clearInterval(timer)
  }, [settings.isPaused, settings.intervalSeconds, photos.length])

  const updateSettings = async (patch: Partial<PhotoWidgetSettings>): Promise<void> => {
    const updated = { ...settings, ...patch }
    setSettings(updated)
    await window.api?.savePhotoSettings?.(updated)
  }

  const navigate = (delta: number): void => {
    if (photos.length <= 1) return
    setCurrentIndex((prev) => (prev + delta + photos.length) % photos.length)
  }

  const handleAddPhotos = async (): Promise<void> => {
    try {
      const updated = await window.api?.pickPhotos?.()
      if (updated && updated.length > 0) {
        setPhotos(updated)
        updated.forEach((p) => loadPhotoSrc(p))
        setCurrentIndex(updated.length - 1)
      }
    } catch (err) {
      console.warn('[PHOTO_WIDGET] Add photos error:', err)
    }
  }

  const handleRemoveCurrent = async (): Promise<void> => {
    if (photos.length === 0) return
    const active = photos[currentIndex]
    if (!active) return
    try {
      const remaining = await window.api?.removePhoto?.(active.id)
      if (remaining) {
        imageCacheRef.current.delete(active.id)
        setPhotos(remaining)
        setCurrentIndex((prev) => Math.max(0, Math.min(prev, remaining.length - 1)))
      }
    } catch (err) {
      console.warn('[PHOTO_WIDGET] Remove photo error:', err)
    }
  }

  const handleClose = async (): Promise<void> => {
    if (onClose) return onClose()
    try { await (window.api?.closeSelf?.() ?? window.api?.closeWidget?.(widgetId)) }
    catch { window.api?.closeWidget?.(widgetId) }
  }

  const fitClass = settings.fitMode === 'cover' ? 'object-cover' : 'object-contain'

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setShowSettingsMenu(false)
      }}
      className="w-screen h-screen p-2.5 flex items-center justify-center bg-transparent select-none overflow-hidden font-sans"
    >
      <div className="w-full h-full glass-panel rounded-apple-xl flex flex-col justify-between shadow-glass-light dark:shadow-glass-dark border border-black/10 dark:border-white/10 relative overflow-hidden group">
        {/* Background Ambient Blur Cross-Fade Layer */}
        {prevPhotoData && isTransitioning && (
          <div
            key={`ambient-prev-${transitionKey}`}
            className="ambient-fade-out absolute inset-0 bg-center bg-cover scale-110 blur-xl opacity-30 dark:opacity-20 pointer-events-none"
            style={{ backgroundImage: `url(${prevPhotoData})` }}
          />
        )}
        {currentPhotoData && (
          <div
            key={`ambient-curr-${transitionKey}`}
            className={`absolute inset-0 bg-center bg-cover scale-110 blur-xl opacity-30 dark:opacity-20 pointer-events-none ${
              isTransitioning ? 'ambient-fade-in' : ''
            }`}
            style={{ backgroundImage: `url(${currentPhotoData})` }}
          />
        )}

        {/* Central Displayed Photo Container */}
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-400">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="text-xs font-medium">Loading photos...</span>
          </div>
        ) : photos.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
            <div className="p-3 rounded-full bg-blue-500/10 text-blue-500 mb-2">
              <ImageIcon className="h-7 w-7" />
            </div>
            <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              No Photos Added
            </h4>
            <p className="text-[10px] text-neutral-400 mt-0.5 mb-3">
              Add your favorite pictures for a continuous desktop slideshow
            </p>
            <button
              onClick={handleAddPhotos}
              className="titlebar-no-drag px-3 py-1.5 rounded-apple-sm bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Choose Photos</span>
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {prevPhotoData && isTransitioning && (
              <div
                key={`layer-prev-${transitionKey}`}
                className="photo-fade-out absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
              >
                <img src={prevPhotoData} alt="Outgoing Slide" className={`w-full h-full ${fitClass}`} />
              </div>
            )}

            {currentPhotoData && (
              <div
                key={`layer-curr-${transitionKey}`}
                className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none ${
                  isTransitioning ? 'photo-fade-in' : ''
                }`}
              >
                <img src={currentPhotoData} alt="Active Slide" className={`w-full h-full ${fitClass}`} />
              </div>
            )}
          </div>
        )}

        {/* Top Header Bar Overlay */}
        <div
          className={`titlebar-drag-region absolute top-0 left-0 right-0 p-2.5 flex items-center justify-between z-20 transition-opacity duration-200 cursor-move ${
            isHovered ? 'opacity-100 bg-gradient-to-b from-black/60 to-transparent' : 'opacity-0'
          }`}
        >
          <div className="titlebar-no-drag flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white/90 text-[10px] font-mono border border-white/10">
            <span>{photos.length > 0 ? currentIndex + 1 : 0}</span>
            <span className="opacity-60">/</span>
            <span>{photos.length}</span>
          </div>

          <div className="titlebar-no-drag flex items-center gap-1 text-white">
            <button onClick={handleAddPhotos} title="Add photos from Mac" className="p-1 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-md text-white/90 hover:text-white transition-colors cursor-pointer">
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => updateSettings({ fitMode: settings.fitMode === 'cover' ? 'contain' : 'cover' })} title={`Switch to ${settings.fitMode === 'cover' ? 'Contain (Fit)' : 'Cover (Fill)'}`} className="p-1 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-md text-white/90 hover:text-white transition-colors cursor-pointer">
              {settings.fitMode === 'cover' ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} title="Slideshow interval settings" className={`p-1 rounded-full backdrop-blur-md transition-colors cursor-pointer ${showSettingsMenu ? 'bg-blue-500 text-white' : 'bg-black/30 hover:bg-black/60 text-white/90 hover:text-white'}`}>
              <Clock className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleClose} title="Close photo widget" className="p-1 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-md text-white/90 hover:text-white transition-colors cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Interval Settings Popup */}
        {showSettingsMenu && (
          <div className="titlebar-no-drag absolute top-10 right-3 z-30 p-2 rounded-apple-md bg-neutral-900/90 backdrop-blur-xl border border-white/10 shadow-2xl text-white text-xs space-y-1.5 animate-in fade-in zoom-in-95">
            <div className="text-[10px] uppercase tracking-wider font-mono text-neutral-400 px-1">
              Loop Interval
            </div>
            <div className="grid grid-cols-3 gap-1">
              {INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setShowSettingsMenu(false)
                    updateSettings({ intervalSeconds: opt.value })
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    settings.intervalSeconds === opt.value
                      ? 'bg-blue-500 text-white font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Playback Bar Overlay */}
        {photos.length > 0 && (
          <div
            className={`titlebar-drag-region absolute bottom-0 left-0 right-0 p-2.5 flex items-center justify-between z-20 transition-opacity duration-200 cursor-move ${
              isHovered ? 'opacity-100 bg-gradient-to-t from-black/60 to-transparent' : 'opacity-0'
            }`}
          >
            <button
              onClick={handleRemoveCurrent}
              title="Delete this photo from slideshow"
              className="titlebar-no-drag p-1.5 rounded-full bg-black/30 hover:bg-rose-500/80 backdrop-blur-md text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
            </button>

            <div className="titlebar-no-drag flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white">
              <button onClick={() => navigate(-1)} title="Previous photo" className="p-1 hover:text-blue-400 transition-colors cursor-pointer">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => updateSettings({ isPaused: !settings.isPaused })} title={settings.isPaused ? 'Resume slideshow' : 'Pause slideshow'} className="p-1 hover:text-blue-400 transition-colors cursor-pointer">
                {settings.isPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
              </button>
              <button onClick={() => navigate(1)} title="Next photo" className="p-1 hover:text-blue-400 transition-colors cursor-pointer">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <span className="titlebar-no-drag text-[10px] text-white/60 font-mono">
              {settings.isPaused ? 'PAUSED' : `${settings.intervalSeconds}s`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
