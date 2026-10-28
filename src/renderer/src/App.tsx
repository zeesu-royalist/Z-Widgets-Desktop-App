import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
  Plus, AppWindow, Eye, EyeOff, Trash2, Sparkles, Clock, Cpu, FileText,
  CloudSun, Layers, Power, Settings as SettingsIcon, CheckCircle2, CheckSquare,
  ChevronRight, Image as ImageIcon, Sun, Moon, LayoutGrid, X, RotateCcw,
  Monitor, Terminal, Zap, ChevronDown, ChevronUp, Minimize2, ArrowLeft,
  Share2, Tag, Search, Play, Pause, ExternalLink, Check, Sliders
} from 'lucide-react'
import { AppInfo, StartupSettings, PersistedWidgetConfig } from '../../shared/types'
import {
  DEV_TEST_WIDGET_ID, DIGITAL_CLOCK_WIDGET_ID, QUICK_NOTES_WIDGET_ID,
  TODO_WIDGET_ID, SYSTEM_MONITOR_WIDGET_ID, WEATHER_WIDGET_ID, PHOTO_WIDGET_ID,
  WIDGET_TYPE_CLOCK, WIDGET_TYPE_NOTES, WIDGET_TYPE_TODO,
  WIDGET_TYPE_SYSTEM, WIDGET_TYPE_WEATHER, WIDGET_TYPE_PHOTO, WIDGET_TYPE_TEST
} from '../../shared/constants'

// --- Widget Catalog with Visual Styling Attributes ---
interface WidgetMeta {
  id: string
  name: string
  caption: string
  cat: string
  desc: string
  w: number
  h: number
  x: number
  y: number
  type: string
  accentColor: string
  cardStyle: 'photo' | 'canyon' | 'equalizer' | 'code' | 'weather' | 'tasks' | 'project'
  icon: React.ReactNode
  isDev?: boolean
}

const WIDGET_CATALOG: WidgetMeta[] = [
  {
    id: PHOTO_WIDGET_ID,
    name: 'Photo Slideshow',
    caption: 'aerial-01',
    cat: 'Media & Gallery',
    desc: 'Continuous looping desktop photo frame with hardware-accelerated ambient transitions.',
    w: 320,
    h: 260,
    x: 760,
    y: 280,
    type: WIDGET_TYPE_PHOTO,
    accentColor: '#0ea5e9',
    cardStyle: 'photo',
    icon: <ImageIcon className="h-4 w-4 text-cyan-400" />
  },
  {
    id: DIGITAL_CLOCK_WIDGET_ID,
    name: 'Digital Clock',
    caption: 'canyon',
    cat: 'Time & Date',
    desc: 'Minimalist desktop clock displaying real-time hours, minutes, seconds, sleep metrics, and date.',
    w: 260,
    h: 260,
    x: 80,
    y: 80,
    type: WIDGET_TYPE_CLOCK,
    accentColor: '#ff5500',
    cardStyle: 'canyon',
    icon: <Clock className="h-4 w-4 text-orange-500" />
  },
  {
    id: SYSTEM_MONITOR_WIDGET_ID,
    name: 'System Resource Monitor',
    caption: 'final soundtrack',
    cat: 'Hardware & System',
    desc: 'Real-time CPU load, memory utilization, and hardware vital stats with audio-waveform equalizer visuals.',
    w: 320,
    h: 240,
    x: 80,
    y: 280,
    type: WIDGET_TYPE_SYSTEM,
    accentColor: '#a855f7',
    cardStyle: 'equalizer',
    icon: <Cpu className="h-4 w-4 text-purple-400" />
  },
  {
    id: QUICK_NOTES_WIDGET_ID,
    name: 'Quick Notes',
    caption: 'index',
    cat: 'Productivity',
    desc: 'Desktop sticky note with auto-save, markdown snippet formatting, and continuous persistence.',
    w: 320,
    h: 260,
    x: 410,
    y: 80,
    type: WIDGET_TYPE_NOTES,
    accentColor: '#eab308',
    cardStyle: 'code',
    icon: <FileText className="h-4 w-4 text-yellow-400" />
  },
  {
    id: WEATHER_WIDGET_ID,
    name: 'Live Weather',
    caption: 'jellyfish',
    cat: 'Information & Forecast',
    desc: 'Atmospheric local temperature, conditions, humidity, and real-time forecast.',
    w: 320,
    h: 280,
    x: 410,
    y: 280,
    type: WIDGET_TYPE_WEATHER,
    accentColor: '#38bdf8',
    cardStyle: 'weather',
    icon: <CloudSun className="h-4 w-4 text-sky-400" />
  },
  {
    id: TODO_WIDGET_ID,
    name: 'To-Do List',
    caption: 'project files',
    cat: 'Productivity',
    desc: 'Track daily goals, checklist priorities, and tasks with completion tracking on desktop.',
    w: 320,
    h: 340,
    x: 760,
    y: 80,
    type: WIDGET_TYPE_TODO,
    accentColor: '#10b981',
    cardStyle: 'tasks',
    icon: <CheckSquare className="h-4 w-4 text-emerald-400" />
  },
  {
    id: DEV_TEST_WIDGET_ID,
    name: 'Internet Telemetry',
    caption: 'internet',
    cat: 'Development Host',
    desc: 'Celestial dial internet telemetry monitor with live bandwidth metrics and telemetry spectrum.',
    w: 320,
    h: 180,
    x: 760,
    y: 560,
    type: WIDGET_TYPE_TEST,
    accentColor: '#d482ec',
    cardStyle: 'project',
    icon: <AppWindow className="h-4 w-4 text-fuchsia-400" />,
    isDev: true
  }
]

const WIDGET_MAP = new Map(WIDGET_CATALOG.map((w) => [w.id, w]))

// Equalizer waveform sample bars for System Monitor card
const WAVE_BARS = [14, 22, 16, 28, 38, 26, 44, 52, 34, 48, 58, 62, 54, 46, 50, 40, 32, 36, 24, 28, 20, 16, 12, 10]

// --- Main macOS Window App Component ---
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

  // macOS Navigation & UI state
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false)
  const [cardScale, setCardScale] = useState<'normal' | 'compact' | 'large'>('normal')
  const [copiedShare, setCopiedShare] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Real-time ticking clock for clock card and status bar
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Sync dark class on document element
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

  const handleToggleAllVisibility = async (): Promise<void> => {
    const allHidden = activeWidgets.every((id) => hiddenWidgetIds.has(id))
    for (const id of activeWidgets) {
      if (allHidden) {
        await window.api?.showWidget?.(id)
      } else {
        await window.api?.hideWidget?.(id)
      }
    }
    setHiddenWidgetIds(allHidden ? new Set() : new Set(activeWidgets))
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

  const handleShareCreator = (): void => {
    navigator.clipboard?.writeText('https://zeesu-royalist.vercel.app')
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2000)
  }

  // Filtered widget catalog based on selected category and search query
  const filteredWidgets = useMemo(() => {
    return WIDGET_CATALOG.filter((w) => {
      const matchesCat =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'active'
            ? activeWidgets.includes(w.id)
            : w.cat === selectedCategory

      const matchesSearch =
        !searchQuery.trim() ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.caption.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesCat && matchesSearch
    })
  }, [selectedCategory, searchQuery, activeWidgets])

  // Category view title
  const viewTitle = useMemo(() => {
    if (searchQuery.trim()) return `Results for "${searchQuery}"`
    switch (selectedCategory) {
      case 'all': return 'Documents'
      case 'active': return 'Active on Desktop'
      case 'Time & Date': return 'Time & Date'
      case 'Productivity': return 'Productivity'
      case 'Hardware & System': return 'System & Hardware'
      case 'Information & Forecast': return 'Live Weather'
      case 'Media & Gallery': return 'Media & Photos'
      default: return 'Documents'
    }
  }, [selectedCategory, searchQuery])

  // Formatted digital time
  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }, [currentTime])

  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  }, [currentTime])

  const isClockActive = activeWidgets.includes(DIGITAL_CLOCK_WIDGET_ID)

  return (
    <div className="h-screen w-screen flex bg-[#ececec] dark:bg-[#121316] text-neutral-800 dark:text-neutral-200 select-none overflow-hidden font-sans antialiased transition-colors duration-200">

      {/* ========================================================
          LEFT SIDEBAR (macOS Translucent Frosted Sidebar)
          ======================================================== */}
      <aside className="w-56 shrink-0 flex flex-col bg-[#e7e7eb]/80 dark:bg-[#1a1b20]/80 backdrop-blur-2xl border-r border-black/[0.08] dark:border-white/[0.08] transition-colors relative z-20">

        {/* macOS Traffic Lights Margin / Window Drag Area */}
        <div className="titlebar-drag-region h-11 w-full flex items-center px-4 gap-2">
          {/* On non-macOS platforms or fallback, show standard colored macOS dots */}
          {appInfo?.platform !== 'darwin' && (
            <div className="titlebar-no-drag flex items-center gap-2">
              <button onClick={() => window.api?.hideWindow?.()} className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-90 transition-all cursor-pointer" title="Close / Hide" />
              <button onClick={() => window.api?.hideWindow?.()} className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-90 transition-all cursor-pointer" title="Minimize" />
              <button className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-90 transition-all cursor-pointer" title="Zoom" />
            </div>
          )}
        </div>

        {/* macOS Toolbar Row (Back, Share, Eye QuickLook, Tag, Search) */}
        <div className="titlebar-no-drag px-3 pb-3 flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setSelectedCategory('all'); setSearchQuery('') }}
              className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Back to All Documents"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleShareCreator}
              className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer relative"
              title="Share / Copy Creator Website"
            >
              {copiedShare ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
            </button>
            <button
              onClick={handleToggleAllVisibility}
              className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Quick Look: Toggle show/hide all desktop widgets"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSelectedCategory((prev) => prev === 'active' ? 'all' : 'active')}
              className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${selectedCategory === 'active' ? 'text-blue-500 bg-blue-500/10' : 'text-neutral-600 dark:text-neutral-400'}`}
              title="Filter Active Widgets"
            >
              <Tag className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => {
              setIsSearchOpen((prev) => !prev)
              setTimeout(() => searchInputRef.current?.focus(), 50)
            }}
            className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${isSearchOpen ? 'text-blue-500 bg-blue-500/10' : 'text-neutral-600 dark:text-neutral-400'}`}
            title="Search widgets"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-[13px] font-normal">
          {([
            { id: 'all', label: 'All My Files', icon: LayoutGrid, count: WIDGET_CATALOG.length },
            { id: 'active', label: 'Active on Desktop', icon: Monitor, count: activeWidgets.length, isPill: true },
            { id: 'Time & Date', label: 'Time & Date', icon: Clock, count: 1 },
            { id: 'Productivity', label: 'Documents', icon: FileText, count: 2 },
            { id: 'Hardware & System', label: 'Applications', icon: Cpu, count: 1 },
            { id: 'Information & Forecast', label: 'Live Weather', icon: CloudSun, count: 1 },
            { id: 'Media & Gallery', label: 'Downloads / Media', icon: ImageIcon, count: 1 }
          ] as const).map((item) => {
            const isSelected = selectedCategory === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedCategory(item.id)
                  setSearchQuery('')
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-all cursor-pointer text-left ${isSelected
                  ? 'bg-black/[0.08] dark:bg-white/[0.12] text-neutral-900 dark:text-white font-medium shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                  }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-blue-500' : 'text-neutral-500 dark:text-neutral-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count > 0 && (
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${isSelected
                    ? 'bg-black/10 dark:bg-white/20 text-neutral-800 dark:text-neutral-100'
                    : 'text-neutral-400 dark:text-neutral-500'
                    }`}>
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Sidebar Footer: Creator Branding + Theme & Settings */}
        <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
          {/* Creator Profile Card (Zeesu Royalist) */}
          <a
            href="https://zeesu-royalist.vercel.app"
            target="_blank"
            rel="noreferrer"
            title="Search 'Zeesu Royalist' on Google or ask any AI"
            className="group flex items-center justify-between p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.06] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-[10px] shrink-0 shadow-xs">
                ZR
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors truncate">
                  Zeesu Royalist
                </p>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
                  Creator & Founder
                </p>
              </div>
            </div>
            <ExternalLink className="h-3 w-3 text-neutral-400 group-hover:text-emerald-500 shrink-0 ml-1 transition-colors" />
          </a>

          {/* Quick Actions (Appearance & Settings) */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setIsDarkMode((prev) => !prev)}
              aria-label="Toggle theme appearance"
              className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-1 text-[11px] text-neutral-400">
              <span className={`w-1.5 h-1.5 rounded-full ${activeWidgets.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
              <span>{activeWidgets.length} active</span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open settings"
              className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Window & Display Settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================
          MAIN CONTENT CANVAS (macOS Finder / Documents Window)
          ======================================================== */}
      <main className="flex-1 flex flex-col bg-[#fbfbfb]/90 dark:bg-[#18191d]/90 backdrop-blur-3xl overflow-hidden relative">

        {/* Top Header Bar (Draggable Titlebar Region) */}
        <header className="titlebar-drag-region h-14 shrink-0 px-8 flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05]">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {viewTitle}
            </h1>
            <span className="text-xs text-neutral-400 font-normal">
              {filteredWidgets.length} item{filteredWidgets.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="titlebar-no-drag flex items-center gap-3">
            {/* Search Input Bar (Visible when toggled or search text exists) */}
            {(isSearchOpen || searchQuery) && (
              <div className="relative flex items-center">
                <Search className="h-3.5 w-3.5 text-neutral-400 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search widgets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-7 py-1 text-xs rounded-md bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-900 dark:text-white w-44 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* Quick Add Button */}
            <button
              onClick={() => !isClockActive ? handleCreateWidget(WIDGET_CATALOG[1]) : handleCreateWidget(filteredWidgets[0] || WIDGET_CATALOG[0])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-medium shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{!isClockActive ? 'Add Digital Clock' : 'Add Widget'}</span>
            </button>
          </div>
        </header>

        {/* Content Body: Media Cards Canvas (Inspired by Reference Image!) */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className={`grid gap-6 ${cardScale === 'compact'
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
            : cardScale === 'large'
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
            {filteredWidgets.map((widget) => {
              const isActive = activeWidgets.includes(widget.id)
              const isHidden = hiddenWidgetIds.has(widget.id)

              // -------------------------------------------------------------
              // 1. Photo Slideshow (aerial-01 style: Ocean aerial preview)
              // -------------------------------------------------------------
              if (widget.cardStyle === 'photo') {
                return (
                  <div key={widget.id} className="flex flex-col items-center group">
                    <div className="w-full h-44 animated-border-wrap transition-all duration-300 group-hover:-translate-y-1">
                    <div className="border-inner w-full h-full rounded-2xl relative overflow-hidden bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e]">
                      {/* Scenic dummy visual */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {/* Aurora / Northern lights bands */}
                        <div className="absolute top-0 left-0 right-0 h-[60%] opacity-60" style={{ background: 'radial-gradient(ellipse 120% 50% at 30% 20%, rgba(72,219,251,0.4) 0%, transparent 60%), radial-gradient(ellipse 100% 40% at 70% 30%, rgba(167,139,250,0.35) 0%, transparent 55%), radial-gradient(ellipse 80% 35% at 50% 10%, rgba(52,211,153,0.3) 0%, transparent 50%)' }} />
                        {/* Glowing orb (sun/moon) */}
                        <div className="absolute top-[18%] left-[50%] -translate-x-1/2 w-10 h-10 rounded-full" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.9) 0%, rgba(251,146,60,0.5) 40%, transparent 70%)', boxShadow: '0 0 40px 15px rgba(251,191,36,0.2)' }} />
                        {/* Floating particles */}
                        <div className="absolute w-1 h-1 bg-white/60 rounded-full top-[12%] left-[15%] animate-pulse" />
                        <div className="absolute w-1.5 h-1.5 bg-cyan-300/40 rounded-full top-[25%] left-[80%] animate-pulse" style={{ animationDelay: '0.5s' }} />
                        <div className="absolute w-1 h-1 bg-purple-300/50 rounded-full top-[8%] left-[60%] animate-pulse" style={{ animationDelay: '1s' }} />
                        <div className="absolute w-0.5 h-0.5 bg-white/50 rounded-full top-[20%] left-[35%] animate-pulse" style={{ animationDelay: '1.5s' }} />
                        <div className="absolute w-1 h-1 bg-emerald-300/40 rounded-full top-[15%] left-[90%] animate-pulse" style={{ animationDelay: '2s' }} />
                        <div className="absolute w-0.5 h-0.5 bg-white/70 rounded-full top-[5%] left-[45%]" />
                        <div className="absolute w-0.5 h-0.5 bg-white/40 rounded-full top-[30%] left-[25%]" />
                        {/* Mountain range - back layer */}
                        <svg className="absolute bottom-0 left-0 w-full h-[55%]" viewBox="0 0 400 120" preserveAspectRatio="none">
                          <path d="M0,120 L0,80 Q40,30 80,60 Q120,20 160,50 Q200,10 240,45 Q280,25 320,55 Q360,35 400,65 L400,120 Z" fill="rgba(15,12,41,0.7)" />
                          <path d="M0,120 L0,90 Q50,50 100,70 Q150,40 200,65 Q250,35 300,60 Q350,45 400,75 L400,120 Z" fill="rgba(20,18,50,0.85)" />
                          <path d="M0,120 L0,95 Q60,70 120,85 Q180,60 240,78 Q300,65 360,82 L400,90 L400,120 Z" fill="rgba(15,15,40,0.95)" />
                        </svg>
                        {/* Water / ground reflection */}
                        <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-gradient-to-b from-[#0d0d2b] to-[#080820]" />
                        <div className="absolute bottom-[3%] left-[25%] w-[50%] h-px bg-gradient-to-r from-transparent via-amber-300/20 to-transparent" />
                        <div className="absolute bottom-[6%] left-[30%] w-[40%] h-px bg-gradient-to-r from-transparent via-cyan-300/15 to-transparent" />
                        <div className="absolute bottom-[9%] left-[35%] w-[30%] h-px bg-gradient-to-r from-transparent via-purple-300/10 to-transparent" />
                      </div>

                      {/* Play Button Icon Overlay (as seen in aerial-01 in image) */}
                      <button
                        onClick={() => !isActive ? handleCreateWidget(widget) : handleToggleWidgetVisibility(widget.id)}
                        className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/30 hover:bg-white/40 active:scale-95 backdrop-blur-md border border-white/40 flex items-center justify-center text-white transition-all cursor-pointer shadow-sm"
                        title={isActive ? 'Toggle visibility on desktop' : 'Launch photo slideshow on desktop'}
                      >
                        <Play className="h-3.5 w-3.5 fill-white ml-0.5" />
                      </button>

                      {/* Top Right Size Badge */}
                      <span className="absolute top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm text-white/90 border border-white/10">
                        {widget.w} × {widget.h}
                      </span>

                      {/* Bottom Content Area */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                        <div>
                          <p className="text-white font-bold text-sm tracking-wide drop-shadow-sm">
                            {widget.caption}
                          </p>
                          <p className="text-white/80 text-[11px] drop-shadow-sm">
                            {widget.name}
                          </p>
                        </div>
                        <button
                          onClick={() => !isActive ? handleCreateWidget(widget) : handleRemoveWidget(widget.id)}
                          className={`text-xs px-2.5 py-1 rounded-md font-semibold backdrop-blur-md transition-all cursor-pointer ${isActive
                            ? 'bg-white/20 hover:bg-rose-500/80 text-white border border-white/30'
                            : 'bg-white text-neutral-900 hover:bg-white/90 shadow-sm'
                            }`}
                        >
                          {isActive ? 'Active' : '+ Add'}
                        </button>
                      </div>
                    </div>
                    </div>
                    {/* Clean caption below tile, matching the image */}
                    <span className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors">
                      {widget.caption}
                    </span>
                  </div>
                )
              }

              // -------------------------------------------------------------
              // 2. Digital Clock (canyon style: Sunset glow & live ticking clock)
              // -------------------------------------------------------------
              if (widget.cardStyle === 'canyon') {
                return (
                  <div key={widget.id} className="flex flex-col items-center group">
                    <div className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg shadow-black/30 border border-white/10 bg-[#000000] p-3.5 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl text-white">
                      {/* Top Header */}
                      <div className="flex items-center justify-between z-10">
                        <span className="text-xs font-medium tracking-tight text-white/90">
                          {formattedDate}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
                          <span className="text-[10px] text-white/80 font-mono">
                            {isActive ? (isHidden ? 'Hidden' : 'Live') : 'Offline'}
                          </span>
                        </div>
                      </div>

                      {/* Center Hero: Thin Digital Time with Superscript Seconds */}
                      <div className="my-auto py-0.5 flex items-start z-10">
                        <span className="text-3xl sm:text-4xl font-extralight tracking-tight text-white font-mono tabular-nums leading-none">
                          {formattedTime.split(' ')[0]}
                        </span>
                        <span className="text-[10px] font-light text-white/80 font-mono ml-1 -mt-0.5">
                          {currentTime.getSeconds().toString().padStart(2, '0')}
                        </span>
                      </div>

                      {/* Mini Orange Day Progress Pill Preview */}
                      <div className="w-full bg-[#ff5500] rounded-xl px-2.5 py-1 text-black shadow-sm z-10">
                        <div className="flex items-center justify-between text-[9px] font-mono font-bold leading-none">
                          <span>00:00</span>
                          <span className="bg-black/15 px-1 py-0.5 rounded text-[8px]">Day Progress</span>
                          <span>24:00</span>
                        </div>
                        <div className="relative w-full h-1.5 my-1 flex items-center">
                          <div className="w-full h-1 flex justify-between items-center opacity-60">
                            {Array.from({ length: 24 }).map((_, i) => (
                              <span key={i} className="w-[1px] h-1 bg-black" />
                            ))}
                          </div>
                          <div className="absolute left-0 h-[1.5px] bg-black rounded-full" style={{ width: '62%' }} />
                        </div>
                      </div>

                      {/* Bottom Controls */}
                      <div className="flex items-center justify-between relative z-10 pt-1">
                        <span className="text-[10px] text-white/80 font-mono">Z-Widgets</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleWidgetVisibility(widget.id)}
                            disabled={!isActive}
                            className="text-[10px] text-white/70 hover:text-white disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            {isHidden ? <><Eye className="h-3 w-3" /><span>Show</span></> : <><EyeOff className="h-3 w-3" /><span>Hide</span></>}
                          </button>
                          <button
                            onClick={() => !isActive ? handleCreateWidget(widget) : handleRemoveWidget(widget.id)}
                            className={`text-xs px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${isActive
                              ? 'bg-white/20 hover:bg-rose-500/80 text-white border border-white/30'
                              : 'bg-white text-neutral-900 hover:bg-white/90 shadow-sm'
                              }`}
                          >
                            {isActive ? 'Active' : '+ Add'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <span className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors">
                      {widget.caption}
                    </span>
                  </div>
                )
              }

              // -------------------------------------------------------------
              // 3. System Resource Monitor (final soundtrack style: Waveform Equalizer)
              // -------------------------------------------------------------
              if (widget.cardStyle === 'equalizer') {
                return (
                  <div key={widget.id} className="col-span-1 sm:col-span-2 flex flex-col group">
                    <div className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg shadow-black/10 dark:shadow-black/40 border border-purple-400/20 dark:border-purple-500/20 bg-gradient-to-r from-purple-300/70 via-purple-200/60 to-indigo-200/70 dark:from-[#2e2042]/90 dark:via-[#261938]/90 dark:to-[#312047]/90 p-5 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
                      {/* Top Bar: Title & Telemetry */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => !isActive ? handleCreateWidget(widget) : handleToggleWidgetVisibility(widget.id)}
                            className="w-7 h-7 rounded-full bg-purple-600 dark:bg-purple-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                            title="Pause / Resume Monitoring"
                          >
                            <Pause className="h-3 w-3 fill-white" />
                          </button>
                          <div>
                            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-mono">
                              System Monitor
                            </h3>
                            <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                              Real-time CPU & Hardware Telemetry
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-semibold">
                            CPU 14%
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 font-semibold">
                            RAM 4.1GB
                          </span>
                          <button
                            onClick={() => !isActive ? handleCreateWidget(widget) : handleRemoveWidget(widget.id)}
                            className={`text-xs px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${isActive
                              ? 'bg-black/10 dark:bg-white/10 hover:bg-rose-500 hover:text-white text-neutral-800 dark:text-neutral-200'
                              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                              }`}
                          >
                            {isActive ? 'Active' : '+ Add'}
                          </button>
                        </div>
                      </div>

                      {/* Center: Live Waveform / Equalizer Bars (directly matching final soundtrack) */}
                      <div className="flex items-end justify-between gap-1.5 h-16 px-2 pt-2">
                        {WAVE_BARS.map((height, i) => (
                          <div
                            key={i}
                            style={{ height: `${height}px` }}
                            className="flex-1 rounded-full bg-gradient-to-t from-purple-600 via-purple-400 to-indigo-200 dark:from-purple-500 dark:via-purple-300 dark:to-white transition-all duration-500 hover:opacity-80"
                          />
                        ))}
                      </div>

                      {/* Bottom Info Row */}
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 pt-1 font-mono">
                        <span>Frequency: 1.0s interval</span>
                        <span>Multi-core Load Normal</span>
                      </div>
                    </div>
                    <span className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors">
                      {widget.caption}
                    </span>
                  </div>
                )
              }

              // -------------------------------------------------------------
              // 4. Quick Notes (Matching QuickNotesWidget Aesthetic)
              // -------------------------------------------------------------
              if (widget.cardStyle === 'code') {
                return (
                  <div key={widget.id} className="flex flex-col items-center group">
                    <div className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg shadow-black/10 dark:shadow-black/40 border border-white/10 bg-[#16171a] text-white p-3.5 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
                      {/* Top Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                            <FileText className="h-3 w-3 text-amber-400" />
                            <span>Quick Notes</span>
                          </div>
                          <h4 className="text-sm font-bold text-white tracking-tight leading-tight mt-0.5">
                            All Notes
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#f8b825] flex items-center justify-center shadow-xs">
                            <Plus className="h-3.5 w-3.5 text-[#3d2700] stroke-[2.75]" />
                          </div>
                          <button
                            onClick={() => !isActive ? handleCreateWidget(widget) : handleRemoveWidget(widget.id)}
                            className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${isActive
                              ? 'bg-white/10 hover:bg-rose-500 text-white'
                              : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm'
                              }`}
                          >
                            {isActive ? 'Active' : '+ Add'}
                          </button>
                        </div>
                      </div>

                      {/* Stacked Note Cards Preview */}
                      <div className="space-y-1.5 py-1">
                        <div className="p-2 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-white leading-tight">Project Ideas</p>
                            <p className="text-[10px] text-neutral-400">18 words • Just now</p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between opacity-60">
                          <p className="text-[11px] text-neutral-300 truncate">Meeting Notes</p>
                          <span className="text-[9px] text-neutral-500">Today</span>
                        </div>
                      </div>

                      {/* Bottom Footer Info */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] text-neutral-400">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Auto-save active
                        </span>
                        <span className="font-mono">3 Notes</span>
                      </div>
                    </div>
                    <span className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors">
                      {widget.caption}
                    </span>
                  </div>
                )
              }

              // -------------------------------------------------------------
              // 5. Live Weather (Dual-Card Aesthetic matching WeatherWidget)
              // -------------------------------------------------------------
              if (widget.cardStyle === 'weather') {
                return (
                  <div key={widget.id} className="flex flex-col items-center group">
                    <div className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg border border-white/10 bg-[#000000] p-2 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl text-white select-none">
                      {/* Top Soft Blue Card */}
                      <div className="w-full bg-[#9db3c5] rounded-xl px-2.5 py-1.5 flex flex-col justify-between text-black">
                        <div className="flex items-start justify-between leading-none">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xl font-light tracking-tight font-sans" style={{ fontWeight: 300 }}>
                                24°
                              </span>
                              <CloudSun className="h-4 w-4 text-black fill-black" />
                            </div>
                            <span className="text-[9px] font-semibold text-black/85 mt-0.5">Partly Cloudy</span>
                          </div>
                          <div className="flex flex-col items-end text-right">
                            <span className="text-[10px] font-bold">Amsterdam</span>
                            <span className="text-[8.5px] font-mono text-black/80 mt-0.5">H: 27° L: 23° ↗ 4</span>
                          </div>
                        </div>

                        {/* Mini Hourly Strip */}
                        <div className="flex items-center justify-between pt-1 border-t border-black/10 mt-1 text-[8px] font-mono">
                          {[
                            ['Now', '20°'],
                            ['14', '20°'],
                            ['16', '20°'],
                            ['18', '16°'],
                            ['20', '15°'],
                            ['22', '15°']
                          ].map(([h, t], i) => (
                            <div key={i} className="flex flex-col items-center">
                              <span className={i === 0 ? 'font-bold' : 'opacity-70'}>{h}</span>
                              <span className="font-semibold">{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Charcoal Card */}
                      <div className="w-full bg-[#1c1e22] rounded-xl px-2.5 py-1.5 flex flex-col justify-between flex-1 mt-1 text-white">
                        <div className="space-y-0.5 text-[9px] font-mono">
                          <div className="flex items-center justify-between leading-none">
                            <span className="text-white/90">Monday</span>
                            <span className="text-slate-400">☁️</span>
                            <span className="text-neutral-400">↗ 6</span>
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-400">9°</span>
                              <div className="w-6 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full w-3/4 bg-gradient-to-r from-sky-400 to-orange-400 rounded-full" />
                              </div>
                              <span className="text-white font-bold">22°</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between leading-none">
                            <span className="text-white/90">Tuesday</span>
                            <span className="text-amber-400">🌤️</span>
                            <span className="text-neutral-400">↗ 4</span>
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-400">11°</span>
                              <div className="w-6 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full w-4/5 bg-gradient-to-r from-sky-400 to-orange-400 rounded-full ml-1" />
                              </div>
                              <span className="text-white font-bold">25°</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions Row */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/[0.08] text-[9px]">
                          <span className="text-[8.5px] font-mono text-neutral-400">58% Hum • 24°C</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleWidgetVisibility(widget.id)}
                              disabled={!isActive}
                              className="text-[9px] text-white/70 hover:text-white disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-0.5"
                            >
                              {isHidden ? <><Eye className="h-2.5 w-2.5" /><span>Show</span></> : <><EyeOff className="h-2.5 w-2.5" /><span>Hide</span></>}
                            </button>
                            <button
                              onClick={() => !isActive ? handleCreateWidget(widget) : handleRemoveWidget(widget.id)}
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${isActive
                                ? 'bg-white/20 hover:bg-rose-500/80 text-white border border-white/30'
                                : 'bg-white text-neutral-900 hover:bg-white/90 shadow-sm'
                                }`}
                            >
                              {isActive ? 'Active' : '+ Add'}
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                    <span className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors">
                      {widget.caption}
                    </span>
                  </div>
                )
              }

              // -------------------------------------------------------------
              // 6. To-Do List (Matching TodoListWidget Flower Wallpaper Aesthetic)
              // -------------------------------------------------------------
              if (widget.cardStyle === 'tasks') {
                return (
                  <div key={widget.id} className="flex flex-col items-center group">
                    <div className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg shadow-black/10 dark:shadow-black/40 border border-white/20 bg-gradient-to-b from-[#6b8f6a] via-[#597858] to-[#435d42] p-2.5 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl text-white">
                      {/* Top Header: Date, Time Pill, Add Button */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-semibold text-white/95 drop-shadow-sm">
                          Wed, 28 Oct
                        </span>

                        <div className="flex items-center gap-2">
                          <div className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-white text-[10px] font-mono border border-white/30 shadow-xs">
                            17:22
                          </div>
                          <button
                            onClick={() => !isActive ? handleCreateWidget(widget) : handleRemoveWidget(widget.id)}
                            className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${isActive
                              ? 'bg-black/30 hover:bg-rose-500 text-white'
                              : 'bg-black/40 hover:bg-black/60 text-white border border-white/20 shadow-sm'
                              }`}
                          >
                            {isActive ? 'Active' : '+ Add'}
                          </button>
                        </div>
                      </div>

                      {/* Floating Black Card: Things to do Today */}
                      <div className="w-full bg-[#19191b] rounded-xl p-2 space-y-1.5 shadow-md border border-white/10 my-0.5">
                        <p className="text-xs font-bold text-white tracking-tight leading-none">
                          Things to do Today
                        </p>

                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center gap-1.5 text-neutral-400 line-through">
                            <div className="w-3.5 h-3.5 rounded-[4px] bg-white text-neutral-950 flex items-center justify-center shrink-0">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </div>
                            <span className="truncate">Design a new shot.</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-neutral-100">
                            <div className="w-3.5 h-3.5 rounded-[4px] border border-white/30 shrink-0" />
                            <span className="truncate">Finish UI updates on web.</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-white/[0.08] text-[9px]">
                          <span className="text-neutral-400 font-mono">1 of 2 completed</span>
                          <span className="bg-[#28282c] px-2 py-0.5 rounded-full text-neutral-200 border border-white/10">
                            + Add Task
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors">
                      {widget.caption}
                    </span>
                  </div>
                )
              }

              // -------------------------------------------------------------
              // 7. Host Window (Internet Telemetry style)
              // -------------------------------------------------------------
              return (
                <div key={widget.id} className="flex flex-col items-center group">
                  <div
                    className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20 text-white p-3.5 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl cursor-default"
                    style={{
                      background: 'linear-gradient(180deg, #100b42 0%, #1a104c 25%, #351a66 60%, #582684 90%, #602888 100%)'
                    }}
                  >
                    {/* Top Row: 10 MB 23 KB & INTERNET label */}
                    <div className="flex items-baseline justify-between z-10">
                      <div className="flex items-baseline tracking-tight font-sans">
                        <span className="font-bold text-lg text-white leading-none">10</span>
                        <span className="text-[10px] font-bold text-[#8071ad] uppercase ml-0.5 mr-1.5 leading-none">MB</span>
                        <span className="font-bold text-lg text-white leading-none">23</span>
                        <span className="text-[10px] font-bold text-[#8071ad] uppercase ml-0.5 leading-none">KB</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#d482ec] leading-none">
                          INTERNET
                        </span>
                      </div>
                    </div>

                    {/* Center: Scaled Mini Celestial Arc Dial */}
                    <div className="flex-1 flex items-center justify-center -my-1 overflow-visible pointer-events-none">
                      <svg viewBox="0 0 240 70" className="w-full h-[62px] overflow-visible">
                        {Array.from({ length: 25 }, (_, i) => {
                          const t = i / 24
                          const alpha = (-52 + 104 * t) * (Math.PI / 180)
                          const sinA = Math.sin(alpha)
                          const cosA = Math.cos(alpha)
                          const cx = 120, cy = -12, rOuter = 72, rInner = 58
                          const isMarker = i === 6
                          const isAccent = i === 18
                          const color = isMarker ? '#ffffff' : isAccent ? '#d482ec' : '#9b76c8'
                          const strokeWidth = isMarker ? 3.5 : 2.5
                          const opacity = isMarker ? 1 : (i === 0 || i === 24) ? 0.25 : (i === 1 || i === 23) ? 0.45 : 0.88

                          return (
                            <line
                              key={i}
                              x1={cx + rInner * sinA}
                              y1={cy + rInner * cosA}
                              x2={cx + rOuter * sinA}
                              y2={cy + rOuter * cosA}
                              stroke={color}
                              strokeWidth={strokeWidth}
                              strokeLinecap="round"
                              strokeOpacity={opacity}
                            />
                          )
                        })}
                        {/* White pointer arrow & indicator */}
                        <polygon points="94,42 98,37 92,34" fill="#ffffff" />
                        <circle cx="95" cy="40" r="1.8" fill="#ffffff" />
                      </svg>
                    </div>

                    {/* Bottom Row: 12kb, mini spectrum visualizer, and Action Button */}
                    <div className="flex items-center justify-between z-10 pt-1">
                      <span className="text-[11px] font-bold text-[#9d6bb1] font-mono leading-none">
                        12kb
                      </span>

                      {/* Mini animated spectrum pill */}
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
                        <div className="flex items-end gap-[2px] h-2.5">
                          {[40, 75, 100, 60, 45].map((h, idx) => (
                            <span
                              key={idx}
                              className="w-[2px] rounded-full"
                              style={{
                                height: `${h}%`,
                                background: idx === 2 ? '#d482ec' : idx % 2 === 0 ? '#a875db' : '#785498'
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-[9px] font-mono text-[#cfb0f5] leading-none">21ms</span>
                      </div>

                      <button
                        onClick={() => !isActive ? handleCreateWidget(widget) : handleRemoveWidget(widget.id)}
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white/20 hover:bg-rose-500 text-white border border-white/20'
                            : 'bg-white text-neutral-900 hover:bg-white/90 shadow-sm'
                        }`}
                      >
                        {isActive ? 'Active' : '+ Add'}
                      </button>
                    </div>
                  </div>
                  <span className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors">
                    {widget.caption}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ========================================================
            BOTTOM STATUS BAR (macOS Finder slider + Breadcrumb)
            ======================================================== */}
        <footer className="h-11 shrink-0 px-8 flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-black/20 backdrop-blur-xl text-xs text-neutral-500 dark:text-neutral-400">

          {/* Left: Startup Status Indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleStartup}
              disabled={isUpdatingStartup || !startupSettings?.isSupported}
              className="flex items-center gap-1.5 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              title="Click to toggle Launch at Login"
            >
              <span className={`w-2 h-2 rounded-full ${startupSettings?.openAtLogin ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
              <span className="text-[11px]">
                {isUpdatingStartup ? 'Saving...' : startupSettings?.openAtLogin ? 'Login Startup: Enabled' : 'Login Startup: Disabled'}
              </span>
            </button>
          </div>

          {/* Center: macOS Window Size Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-400">Size</span>
            <div className="h-1.5 w-24 bg-black/10 dark:bg-white/10 rounded-full relative flex items-center">
              <button
                onClick={() => setCardScale((prev) => prev === 'compact' ? 'normal' : prev === 'normal' ? 'large' : 'compact')}
                className={`h-3.5 w-3.5 rounded-full bg-white dark:bg-neutral-200 shadow-md border border-black/10 transition-all cursor-pointer ${cardScale === 'compact' ? 'left-0' : cardScale === 'normal' ? 'left-[40%]' : 'left-[85%]'
                  } absolute`}
                title={`View Scale: ${cardScale} (Click to cycle)`}
              />
            </div>
            <span className="text-[10px] font-mono capitalize text-neutral-400">{cardScale}</span>
          </div>

          {/* Right: Breadcrumb Path (Linking to Zeesu Royalist website) */}
          <div className="flex items-center gap-1 text-[11px] font-normal">
            <span className="text-neutral-400">Users</span>
            <ChevronRight className="h-3 w-3 text-neutral-400" />
            <a
              href="https://zeesu-royalist.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-neutral-700 dark:text-neutral-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              title="Search 'Zeesu Royalist' on Google or ask any AI"
            >
              Zeesu Royalist
            </a>
            <ChevronRight className="h-3 w-3 text-neutral-400" />
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{viewTitle}</span>
          </div>
        </footer>
      </main>

      {/* ========================================================
          SETTINGS & CREATOR MODAL
          ======================================================== */}
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
