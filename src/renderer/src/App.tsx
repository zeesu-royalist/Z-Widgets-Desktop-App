import React, { useEffect, useState, useRef } from 'react'
import {
  Plus, AppWindow, Eye, EyeOff, Trash2, Sparkles, Clock, Cpu, FileText,
  CloudSun, Layers, Power, Settings as SettingsIcon, CheckCircle2, CheckSquare,
  ChevronRight, Image as ImageIcon, Sun, Moon, LayoutGrid, X, RotateCcw,
  Monitor, Terminal, Zap, ChevronDown, ChevronUp, Minimize2
} from 'lucide-react'
import { AppInfo, StartupSettings, PersistedWidgetConfig } from '../../shared/types'
import {
  DEV_TEST_WIDGET_ID, DIGITAL_CLOCK_WIDGET_ID, QUICK_NOTES_WIDGET_ID,
  TODO_WIDGET_ID, SYSTEM_MONITOR_WIDGET_ID, WEATHER_WIDGET_ID, PHOTO_WIDGET_ID,
  WIDGET_TYPE_CLOCK, WIDGET_TYPE_NOTES, WIDGET_TYPE_TODO,
  WIDGET_TYPE_SYSTEM, WIDGET_TYPE_WEATHER, WIDGET_TYPE_PHOTO, WIDGET_TYPE_TEST
} from '../../shared/constants'

// --- Compact Widget Definitions ---
const WIDGET_CATALOG = [
  { id: DIGITAL_CLOCK_WIDGET_ID, name: 'Digital Clock', cat: 'Time & Date', desc: 'Minimalist desktop clock displaying live time and date.', w: 300, h: 160, x: 80, y: 80, type: WIDGET_TYPE_CLOCK, icon: <Clock className="h-5 w-5 text-blue-500" /> },
  { id: QUICK_NOTES_WIDGET_ID, name: 'Quick Notes', cat: 'Productivity', desc: 'Desktop sticky note with auto-save and continuous persistence.', w: 320, h: 260, x: 410, y: 80, type: WIDGET_TYPE_NOTES, icon: <FileText className="h-5 w-5 text-amber-500" /> },
  { id: TODO_WIDGET_ID, name: 'To-Do List', cat: 'Productivity', desc: 'Keep track of daily goals, tasks, and checklists directly on desktop.', w: 320, h: 340, x: 760, y: 80, type: WIDGET_TYPE_TODO, icon: <CheckSquare className="h-5 w-5 text-emerald-500" /> },
  { id: SYSTEM_MONITOR_WIDGET_ID, name: 'System Resource Monitor', cat: 'Hardware & System', desc: 'Real-time CPU load, memory utilization, and hardware vital stats.', w: 320, h: 240, x: 80, y: 280, type: WIDGET_TYPE_SYSTEM, icon: <Cpu className="h-5 w-5 text-cyan-500" /> },
  { id: WEATHER_WIDGET_ID, name: 'Live Weather', cat: 'Information & Forecast', desc: 'Real-time local temperature, condition, humidity, and forecast.', w: 320, h: 280, x: 410, y: 280, type: WIDGET_TYPE_WEATHER, icon: <CloudSun className="h-5 w-5 text-amber-500" /> },
  { id: PHOTO_WIDGET_ID, name: 'Photo Slideshow', cat: 'Media & Gallery', desc: 'Continuous looping desktop photo frame for your favorite photos.', w: 320, h: 260, x: 760, y: 280, type: WIDGET_TYPE_PHOTO, icon: <ImageIcon className="h-5 w-5 text-purple-500" /> },
  { id: DEV_TEST_WIDGET_ID, name: 'Host Window (Interactive)', cat: 'Development Host', desc: 'Frameless desktop test window with least-privilege IPC isolation.', w: 320, h: 180, x: 760, y: 560, type: WIDGET_TYPE_TEST, icon: <AppWindow className="h-5 w-5 text-indigo-500" />, isDev: true }
]
const WIDGET_MAP = new Map(WIDGET_CATALOG.map((w) => [w.id, w]))

// --- Main App Dashboard ---
export const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [activeWidgets, setActiveWidgets] = useState<string[]>([])
  const [persistedWidgets, setPersistedWidgets] = useState<PersistedWidgetConfig[]>([])
  const [hiddenWidgetIds, setHiddenWidgetIds] = useState<Set<string>>(new Set())
  const [startupSettings, setStartupSettings] = useState<StartupSettings | null>(null)
  const [isUpdatingStartup, setIsUpdatingStartup] = useState<boolean>(false)
  const [isRecovering, setIsRecovering] = useState<boolean>(false)
  const [recoveryFeedback, setRecoveryFeedback] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [showDiag, setShowDiag] = useState<boolean>(false)
  const [isPinging, setIsPinging] = useState<boolean>(false)
  const [ipcStatus, setIpcStatus] = useState<string>('Ready')

  const widgetLibraryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  const refreshPersistedList = (): void => {
    window.api?.getPersistedWidgets?.().then((items) => {
      setPersistedWidgets(items)
      const hidden = items.filter((i) => i.isVisible === false).map((i) => i.id)
      if (hidden.length) setHiddenWidgetIds((prev) => new Set([...prev, ...hidden]))
    }).catch(console.error)
  }

  useEffect(() => {
    Promise.all([
      window.api?.getAppInfo?.(),
      window.api?.getActiveWidgets?.(),
      window.api?.getStartupSettings?.()
    ]).then(([info, active, startup]) => {
      if (info) setAppInfo(info)
      if (active) setActiveWidgets(active)
      if (startup) setStartupSettings(startup)
    }).catch(console.error)
    refreshPersistedList()

    const unsub = window.api?.onWidgetStateChanged?.((ids) => {
      setActiveWidgets(ids)
      setHiddenWidgetIds((prev) => new Set([...prev].filter((id) => ids.includes(id))))
      refreshPersistedList()
    })
    return () => unsub?.()
  }, [])

  const handleCreateWidget = async (cfg: { id: string; name?: string; title?: string; w?: number; width?: number; h?: number; height?: number; x?: number; y?: number; type?: string }): Promise<void> => {
    try {
      await window.api?.createWidget?.({
        id: cfg.id,
        title: cfg.title || cfg.name || 'Widget',
        width: cfg.width || cfg.w || 320,
        height: cfg.height || cfg.h || 240,
        x: cfg.x ?? 120,
        y: cfg.y ?? 120,
        type: cfg.type || 'standard',
        placementMode: 'desktop'
      })
      setHiddenWidgetIds((prev) => { const next = new Set(prev); next.delete(cfg.id); return next })
    } catch (err) {
      console.error('Failed to create widget:', err)
    }
  }

  const handleToggleWidgetVisibility = async (id: string): Promise<void> => {
    const isHidden = hiddenWidgetIds.has(id)
    try {
      await (isHidden ? (window.api?.showWidget?.(id) ?? window.api?.toggleWidget?.(id)) : (window.api?.hideWidget?.(id) ?? window.api?.toggleWidget?.(id)))
      setHiddenWidgetIds((prev) => {
        const next = new Set(prev)
        isHidden ? next.delete(id) : next.add(id)
        return next
      })
    } catch (err) {
      console.error('Failed to toggle widget visibility:', err)
    }
  }

  const handleRemoveWidget = async (id: string): Promise<void> => {
    try {
      await window.api?.closeWidget?.(id)
      setHiddenWidgetIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      setTimeout(refreshPersistedList, 150)
    } catch (err) {
      console.error('Failed to close widget:', err)
    }
  }

  const handleToggleStartup = async (): Promise<void> => {
    if (!window.api?.setStartupSettings || isUpdatingStartup) return
    setIsUpdatingStartup(true)
    try {
      const updated = await window.api.setStartupSettings(!startupSettings?.openAtLogin)
      setStartupSettings(updated)
    } catch (err) {
      console.error('Failed to update startup settings:', err)
    } finally {
      setIsUpdatingStartup(false)
    }
  }

  const handleRecoverDisplays = async (): Promise<void> => {
    if (!window.api?.recoverOffscreenWidgets || isRecovering) return
    setIsRecovering(true)
    setRecoveryFeedback(null)
    try {
      const res = await window.api.recoverOffscreenWidgets()
      setRecoveryFeedback(res.recoveredCount > 0 ? `Shifted ${res.recoveredCount} off-screen widget(s) onto primary display` : 'All active widgets are currently in visible screen bounds')
      refreshPersistedList()
    } catch (err) {
      setRecoveryFeedback(`Recovery error: ${err}`)
    } finally {
      setTimeout(() => setIsRecovering(false), 500)
    }
  }

  const handlePing = async (): Promise<void> => {
    if (!window.api?.ping) return
    setIsPinging(true)
    try {
      const res = await window.api.ping()
      setIpcStatus(`IPC Connected: received "${res}"`)
    } catch (err) {
      setIpcStatus(`IPC Error: ${err}`)
    } finally {
      setTimeout(() => setIsPinging(false), 350)
    }
  }

  const isClockActive = activeWidgets.includes(DIGITAL_CLOCK_WIDGET_ID)

  // Map active widgets in O(1)
  const myWidgets = activeWidgets.map((id) => {
    const isHidden = hiddenWidgetIds.has(id)
    const def = WIDGET_MAP.get(id)
    const persisted = persistedWidgets.find((p) => p.id === id)
    return {
      id,
      name: def?.name || `Widget ${id}`,
      type: def?.cat ? `${def.cat} Widget` : persisted?.type || 'Desktop Widget',
      dimensions: def ? `${def.w} × ${def.h}` : (persisted ? `${persisted.width} × ${persisted.height}` : '320 × 200'),
      isHidden,
      isPersistent: id !== DEV_TEST_WIDGET_ID,
      icon: def?.icon || <Sparkles className="h-5 w-5 text-blue-500" />
    }
  })

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-b from-neutral-100 via-neutral-100 to-neutral-200 dark:from-[#0a0a0c] dark:via-[#0e1014] dark:to-[#12141a] text-neutral-900 dark:text-neutral-100 transition-colors duration-300 font-sans select-none overflow-hidden">
      {/* Header */}
      <header className="titlebar-drag-region h-14 w-full flex items-center justify-between px-6 border-b border-black/[0.06] dark:border-white/[0.06] bg-white/60 dark:bg-[#0c0d10]/60 backdrop-blur-xl z-20 sticky top-0 transition-colors">
        <div className={`flex items-center gap-2.5 ${appInfo?.platform === 'darwin' ? 'pl-16' : 'pl-0'}`}>
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 font-bold text-xs">
            Z
          </div>
          <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Z-Widgets</span>
        </div>
        <div className="titlebar-no-drag flex items-center gap-1.5">
          <button onClick={() => setIsDarkMode((prev) => !prev)} aria-label="Toggle appearance theme" title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'} className="p-2 rounded-apple-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={() => setIsSettingsOpen(true)} aria-label="Open settings" title="Settings" className={`p-2 rounded-apple-sm transition-colors cursor-pointer ${isSettingsOpen ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}>
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 max-w-5xl w-full mx-auto space-y-10">
        {/* Hero Section */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
          <div className="space-y-1.5 max-w-xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Your Desktop, Your Way</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Place interactive desktop widgets directly on your wallpaper. Toggle visibility, manage positions, and keep essential tools in sight.</p>
          </div>
          <button
            onClick={() => !isClockActive ? handleCreateWidget(WIDGET_CATALOG[0]) : widgetLibraryRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-apple-md bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{!isClockActive ? 'Add Digital Clock' : 'Add Widget'}</span>
          </button>
        </section>

        {/* My Widgets Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">My Widgets</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">{myWidgets.length} Active</span>
            </div>
            {myWidgets.length > 0 && <span className="text-xs text-neutral-400 dark:text-neutral-500">Running in background</span>}
          </div>

          {myWidgets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myWidgets.map((w) => (
                <div key={w.id} className="glass-panel rounded-apple-xl p-4 flex flex-col justify-between gap-4 border border-black/10 dark:border-white/10 shadow-glass-light dark:shadow-glass-dark">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-apple-sm bg-black/5 dark:bg-white/5 flex items-center justify-center">{w.icon}</div>
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{w.name}</h3>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">id: {w.id} • {w.dimensions}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${w.isHidden ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{w.isHidden ? 'Hidden' : 'Visible'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                    <div className="text-[11px] text-neutral-400">{w.isPersistent ? 'Saved to local storage' : 'Development session'}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleWidgetVisibility(w.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-apple-sm text-xs font-medium bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer" title={w.isHidden ? 'Show on desktop' : 'Hide from desktop'}>
                        {w.isHidden ? <><Eye className="h-3.5 w-3.5" /><span>Show</span></> : <><EyeOff className="h-3.5 w-3.5" /><span>Hide</span></>}
                      </button>
                      <button onClick={() => handleRemoveWidget(w.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-apple-sm text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer" title="Remove widget">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-apple-xl border border-dashed border-black/15 dark:border-white/15 bg-black/[0.01] dark:bg-white/[0.01] flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Layers className="h-6 w-6" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">No widgets active on your desktop</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">Add the Digital Clock below to enjoy live time and date directly on your desktop.</p>
              </div>
              <button onClick={() => handleCreateWidget(WIDGET_CATALOG[0])} className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-apple-sm bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 shadow-sm transition-colors cursor-pointer">
                <Plus className="h-3.5 w-3.5" /><span>Add Digital Clock</span>
              </button>
            </div>
          )}
        </section>

        {/* Widget Library Section */}
        <section ref={widgetLibraryRef} className="space-y-6 pt-2">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Widget Library</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Choose from available widgets. All active widgets feature frameless transparent rendering and space persistence.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WIDGET_CATALOG.map((widget) => {
              const isActive = activeWidgets.includes(widget.id)
              return (
                <div key={widget.id} className="glass-panel rounded-apple-xl p-5 flex flex-col justify-between gap-4 border border-black/10 dark:border-white/10 shadow-glass-light dark:shadow-glass-dark">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-apple-sm bg-black/5 dark:bg-white/5 flex items-center justify-center">{widget.icon}</div>
                        <div>
                          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{widget.name}</h3>
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{widget.cat}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {widget.isDev ? 'Dev Test Host' : 'Live Widget'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{widget.desc}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                    <span className="text-[11px] text-neutral-400">Size: {widget.w} × {widget.h}</span>
                    <button
                      onClick={() => !isActive ? handleCreateWidget(widget) : handleToggleWidgetVisibility(widget.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-apple-sm text-xs font-semibold transition-all cursor-pointer ${isActive ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-700' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'}`}
                    >
                      {isActive ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span>Active on Desktop</span></> : <><Plus className="h-3.5 w-3.5" /><span>Add to Desktop</span></>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Upcoming Roadmap */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Upcoming Modules (In Development)</h3>
              <span className="text-[11px] text-neutral-400">Milestone 6 Modular Architecture</span>
            </div>
            <div className="p-4 rounded-apple-md bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between opacity-75">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-apple-sm bg-black/5 dark:bg-white/5"><Layers className="h-5 w-5 text-neutral-400" /></div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Quick Calculator</h4>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">Compact desktop calculator with history tape and quick conversion tools.</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">Coming Soon</span>
            </div>
          </div>
        </section>

        {/* Quick Settings Card */}
        <section className="pt-2">
          <div className="glass-panel rounded-apple-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-black/10 dark:border-white/10 shadow-glass-light dark:shadow-glass-dark">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-apple-sm bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"><Power className="h-4 w-4" /></div>
              <div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Launch Z-Widgets at Login</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {startupSettings?.openAtLogin ? 'Application launches automatically in the system tray' : 'Automatic startup is currently turned off'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleToggleStartup} disabled={isUpdatingStartup || !startupSettings?.isSupported} className={`px-3 py-1.5 rounded-apple-sm text-xs font-semibold transition-all cursor-pointer ${startupSettings?.openAtLogin ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm' : 'bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200'}`}>
                {isUpdatingStartup ? 'Saving...' : startupSettings?.openAtLogin ? 'Enabled' : 'Enable'}
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer pl-2 border-l border-black/10 dark:border-white/10">
                <SettingsIcon className="h-3.5 w-3.5" /><span>Display & More</span><ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </section>

        <footer className="pt-4 pb-6 border-t border-black/[0.04] dark:border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-neutral-400 dark:text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span>Z-Widgets • Created by</span>
            <a href="https://zeesu-royalist.vercel.app" target="_blank" rel="noreferrer" className="font-semibold text-neutral-800 dark:text-neutral-200 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors underline decoration-neutral-300 dark:decoration-neutral-700 underline-offset-2">
              Zeesu Royalist
            </a>
          </div>
          <span>Search &ldquo;Zeesu Royalist&rdquo; on Google or ask any AI</span>
        </footer>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-panel rounded-apple-xl p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Settings</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Customize startup, appearance, and display management</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} aria-label="Close settings" className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">General</h3>
              <div className="flex items-center justify-between p-3.5 rounded-apple-md bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-apple-sm bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mt-0.5"><Power className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Launch at Login</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mt-0.5 leading-relaxed">Automatically start Z-Widgets in background on login.</p>
                    {!startupSettings?.isPackaged && <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">• Dev mode: Saved locally without registry modifications</span>}
                  </div>
                </div>
                <button onClick={handleToggleStartup} disabled={isUpdatingStartup || !startupSettings?.isSupported} className={`px-3 py-1.5 rounded-apple-sm text-xs font-semibold transition-all cursor-pointer ${startupSettings?.openAtLogin ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'}`}>
                  {isUpdatingStartup ? 'Saving...' : startupSettings?.openAtLogin ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-apple-md bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-apple-sm bg-amber-500/10 text-amber-600 dark:text-amber-400">{isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Appearance</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{isDarkMode ? 'Dark theme active' : 'Light theme active'}</p>
                  </div>
                </div>
                <button onClick={() => setIsDarkMode((prev) => !prev)} className="px-3 py-1.5 rounded-apple-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer">
                  {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
              <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Display & Monitors</h3>
              <div className="p-3.5 rounded-apple-md bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-apple-sm bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5"><RotateCcw className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Multi-Monitor Position Recovery</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">Rescue orphaned off-screen widgets back onto your primary monitor.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  {recoveryFeedback ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{recoveryFeedback}</span> : <span className="text-[11px] text-neutral-400">Automated watcher: 300ms active</span>}
                  <button onClick={handleRecoverDisplays} disabled={isRecovering} className="px-3 py-1.5 rounded-apple-sm bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer flex items-center gap-1.5">
                    <RotateCcw className={`h-3 w-3 ${isRecovering ? 'animate-spin' : ''}`} />
                    <span>{isRecovering ? 'Checking...' : 'Recover Widgets'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Creator & Author Section */}
            <div className="space-y-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
              <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Creator & Author</h3>
              <div className="p-3.5 rounded-apple-md bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent border border-emerald-500/20 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-emerald-500/20">
                      ZR
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Zeesu Royalist</h4>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Founder & Creator of Z-Widgets</p>
                    </div>
                  </div>
                  <a
                    href="https://zeesu-royalist.vercel.app"
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-apple-sm bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    Visit Website
                  </a>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Search <span className="font-semibold text-neutral-900 dark:text-neutral-100">&ldquo;Zeesu Royalist&rdquo;</span> on Google or ask any AI to know who I am and discover my journey and portfolio.
                </p>
                <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-400 border-t border-black/[0.04] dark:border-white/[0.04]">
                  <span>Portfolio: <span className="font-mono text-neutral-600 dark:text-neutral-300">zeesu-royalist.vercel.app</span></span>
                  <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-600 dark:text-emerald-400 font-semibold">• Verified Creator</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
              <button onClick={() => setShowDiag(!showDiag)} className="w-full flex items-center justify-between text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 py-1 transition-colors cursor-pointer">
                <span>Diagnostics & Runtime Information</span>
                {showDiag ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showDiag && (
                <div className="mt-3 p-3.5 rounded-apple-md bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs text-neutral-500">
                    {([
                      [Monitor, `Platform: ${appInfo?.platform || 'darwin'}`],
                      [Cpu, `Electron: v${appInfo?.electronVersion || '...'}`],
                      [Terminal, `Chromium: v${appInfo?.chromeVersion || '...'}`],
                      [Zap, `Node: v${appInfo?.nodeVersion || '...'}`]
                    ] as [React.ElementType, string][]).map(([IconComp, text], i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <IconComp className="h-3.5 w-3.5" />
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <span className="text-[11px] text-neutral-400 font-mono">{ipcStatus}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={handlePing} disabled={isPinging} className="px-2.5 py-1 rounded bg-black/5 dark:bg-white/5 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer">{isPinging ? 'Pinging...' : 'Test IPC Ping'}</button>
                      <button onClick={() => window.api?.hideWindow?.()} className="px-2.5 py-1 rounded bg-black/5 dark:bg-white/5 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer flex items-center gap-1"><Minimize2 className="h-3 w-3" /><span>Hide to Tray</span></button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 rounded-apple-sm bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-xs font-semibold transition-colors cursor-pointer">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
