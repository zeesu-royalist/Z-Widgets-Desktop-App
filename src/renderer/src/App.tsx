import React, { useEffect, useState, useRef, useMemo, memo } from 'react'
import {
  Plus, AppWindow, Eye, EyeOff, Clock, Cpu, FileText,
  CloudSun, Power, Settings as SettingsIcon, CheckCircle2, CheckSquare,
  ChevronRight, Image as ImageIcon, Sun, Moon, LayoutGrid, X, RotateCcw,
  Monitor, Terminal, Zap, ChevronDown, ChevronUp, Minimize2, ArrowLeft,
  Share2, Tag, Search, Check, Folder, Calendar as CalendarIcon, ExternalLink,
  ArrowDown, Download, Pause
} from 'lucide-react'
import { AppInfo, StartupSettings, PersistedWidgetConfig } from '../../shared/types'
import {
  DEV_TEST_WIDGET_ID, DIGITAL_CLOCK_WIDGET_ID, QUICK_NOTES_WIDGET_ID,
  TODO_WIDGET_ID, SYSTEM_MONITOR_WIDGET_ID, WEATHER_WIDGET_ID, PHOTO_WIDGET_ID,
  DEPTH_DIVE_WIDGET_ID, DUO_CALENDAR_WIDGET_ID,
  WIDGET_TYPE_CLOCK, WIDGET_TYPE_NOTES, WIDGET_TYPE_TODO,
  WIDGET_TYPE_SYSTEM, WIDGET_TYPE_WEATHER, WIDGET_TYPE_PHOTO, WIDGET_TYPE_TEST,
  WIDGET_TYPE_DEPTH, WIDGET_TYPE_DUO
} from '../../shared/constants'

// --- Widget Metadata & Category Mapping ---
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
  cardStyle: 'photo' | 'canyon' | 'equalizer' | 'code' | 'weather' | 'tasks' | 'project' | 'dive' | 'duo'
  icon: React.ReactNode
  isDev?: boolean
}

const CATEGORY_TITLES: Record<string, string> = {
  all: 'Documents',
  active: 'Active on Desktop',
  'Time & Date': 'Time & Date',
  'Productivity': 'Productivity',
  'Hardware & System': 'System & Hardware',
  'Information & Forecast': 'Live Weather',
  'Media & Gallery': 'Media & Photos'
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
    caption: 'music & soundtrack',
    cat: 'Hardware & System',
    desc: 'Real-time CPU load, memory utilization, and hardware vital stats with audio-waveform equalizer music visuals.',
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
  },
  {
    id: DEPTH_DIVE_WIDGET_ID,
    name: 'File Activity Monitor',
    caption: 'file activity',
    cat: 'Hardware & System',
    desc: 'Apple Watch Ultra style monitor displaying active file processes, downloads, documents sync, and background tasks.',
    w: 320,
    h: 180,
    x: 80,
    y: 560,
    type: WIDGET_TYPE_DEPTH,
    accentColor: '#edd75e',
    cardStyle: 'dive',
    icon: <Folder className="h-4 w-4 text-yellow-400" />
  },
  {
    id: DUO_CALENDAR_WIDGET_ID,
    name: 'Duo Weather & Match Calendar',
    caption: 'duo calendar',
    cat: 'Time & Date',
    desc: 'Vibrant dual-card widget featuring real-time weather and a 2-week agenda with upcoming football match events.',
    w: 350,
    h: 180,
    x: 410,
    y: 560,
    type: WIDGET_TYPE_DUO,
    accentColor: '#ffde00',
    cardStyle: 'duo',
    icon: <CalendarIcon className="h-4 w-4 text-yellow-400" />
  }
]

const WAVE_BARS = [14, 22, 16, 28, 38, 26, 44, 52, 34, 48, 58, 62, 54, 46, 50, 40, 32, 36, 24, 28, 20, 16, 12, 10]

// --- Memoized Card Preview Component (Zero Unnecessary Re-renders on 1s clock ticks) ---
interface PreviewCardProps {
  widget: WidgetMeta
  isActive: boolean
  isHidden: boolean
  formattedDate: string
  formattedTime: string
  currentSeconds: string
  onToggleActive: (w: WidgetMeta) => void
  onToggleVisibility: (id: string) => void
}

const WidgetPreviewCard = memo<PreviewCardProps>(({
  widget,
  isActive,
  isHidden,
  formattedDate,
  formattedTime,
  currentSeconds,
  onToggleActive,
  onToggleVisibility
}) => {
  const isEqualizer = widget.cardStyle === 'equalizer'

  const renderCardContent = () => {
    switch (widget.cardStyle) {
      case 'photo':
        return (
          <div className="w-full h-44 animated-border-wrap transition-all duration-300 group-hover:-translate-y-1">
            <div className="border-inner w-full h-full rounded-2xl relative overflow-hidden bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e]">
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[60%] opacity-60" style={{ background: 'radial-gradient(ellipse 120% 50% at 30% 20%, rgba(72,219,251,0.4) 0%, transparent 60%), radial-gradient(ellipse 100% 40% at 70% 30%, rgba(167,139,250,0.35) 0%, transparent 55%), radial-gradient(ellipse 80% 35% at 50% 10%, rgba(52,211,153,0.3) 0%, transparent 50%)' }} />
                <div className="absolute top-[18%] left-[50%] -translate-x-1/2 w-10 h-10 rounded-full" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.9) 0%, rgba(251,146,60,0.5) 40%, transparent 70%)', boxShadow: '0 0 40px 15px rgba(251,191,36,0.2)' }} />
                <div className="absolute w-1 h-1 bg-white/60 rounded-full top-[12%] left-[15%] animate-pulse" />
                <div className="absolute w-1.5 h-1.5 bg-cyan-300/40 rounded-full top-[25%] left-[80%] animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="absolute w-1 h-1 bg-purple-300/50 rounded-full top-[8%] left-[60%] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute w-0.5 h-0.5 bg-white/50 rounded-full top-[20%] left-[35%] animate-pulse" style={{ animationDelay: '1.5s' }} />
                <div className="absolute w-1 h-1 bg-emerald-300/40 rounded-full top-[15%] left-[90%] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute w-0.5 h-0.5 bg-white/70 rounded-full top-[5%] left-[45%]" />
                <div className="absolute w-0.5 h-0.5 bg-white/40 rounded-full top-[30%] left-[25%]" />
                <svg className="absolute bottom-0 left-0 w-full h-[55%]" viewBox="0 0 400 120" preserveAspectRatio="none">
                  <path d="M0,120 L0,80 Q40,30 80,60 Q120,20 160,50 Q200,10 240,45 Q280,25 320,55 Q360,35 400,65 L400,120 Z" fill="rgba(15,12,41,0.7)" />
                  <path d="M0,120 L0,90 Q50,50 100,70 Q150,40 200,65 Q250,35 300,60 Q350,45 400,75 L400,120 Z" fill="rgba(20,18,50,0.85)" />
                  <path d="M0,120 L0,95 Q60,70 120,85 Q180,60 240,78 Q300,65 360,82 L400,90 L400,120 Z" fill="rgba(15,15,40,0.95)" />
                </svg>
                <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-gradient-to-b from-[#0d0d2b] to-[#080820]" />
                <div className="absolute bottom-0 left-0 right-0 h-[45%] pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 20%, rgba(251,191,36,0.12) 0%, transparent 60%)' }} />
                <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-300/80 tracking-widest uppercase flex items-center gap-1">
                  <span>Ambient Slideshow</span>
                </div>
                <div className="absolute bottom-2 left-2.5 text-[9px] font-mono text-white/50 tracking-wider">
                  <span>Nature • 4 Photos</span>
                </div>
              </div>
              <div className="absolute top-3 right-3 z-10">
                <button
                  onClick={() => onToggleActive(widget)}
                  className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    isActive ? 'bg-white/20 hover:bg-rose-500 text-white border border-white/20' : 'bg-white text-neutral-900 hover:bg-white/90 shadow-sm'
                  }`}
                >
                  {isActive ? 'Active' : '+ Add'}
                </button>
              </div>
            </div>
          </div>
        )

      case 'canyon':
        return (
          <div className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg shadow-black/30 border border-white/10 bg-[#000000] p-3.5 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl text-white">
            <div className="flex items-center justify-between z-10">
              <span className="text-xs font-medium tracking-tight text-white/90">{formattedDate}</span>
              <span className="text-[10px] text-white/80 font-mono">{isActive ? (isHidden ? 'Hidden' : 'Live') : 'Offline'}</span>
            </div>
            <div className="my-auto py-0.5 flex items-start z-10">
              <span className="text-3xl sm:text-4xl font-extralight tracking-tight text-white font-mono tabular-nums leading-none">
                {formattedTime.split(' ')[0]}
              </span>
              <span className="text-[10px] font-light text-white/80 font-mono ml-1 -mt-0.5">{currentSeconds}</span>
            </div>
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
            <div className="flex items-center justify-between relative z-10 pt-1">
              <span className="text-[10px] text-white/80 font-mono">Z-Widgets</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onToggleVisibility(widget.id)}
                  disabled={!isActive}
                  className="text-[10px] text-white/70 hover:text-white disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
                >
                  {isHidden ? <><Eye className="h-3 w-3" /><span>Show</span></> : <><EyeOff className="h-3 w-3" /><span>Hide</span></>}
                </button>
                <button
                  onClick={() => onToggleActive(widget)}
                  className={`text-xs px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                    isActive ? 'bg-white/20 hover:bg-rose-500/80 text-white border border-white/30' : 'bg-white text-neutral-900 hover:bg-white/90 shadow-sm'
                  }`}
                >
                  {isActive ? 'Active' : '+ Add'}
                </button>
              </div>
            </div>
          </div>
        )

      case 'equalizer':
        return (
          <div className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg shadow-black/10 dark:shadow-black/40 border border-purple-400/20 dark:border-purple-500/20 bg-gradient-to-r from-purple-300/70 via-purple-200/60 to-indigo-200/70 dark:from-[#2e2042]/90 dark:via-[#261938]/90 dark:to-[#312047]/90 p-5 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => !isActive ? onToggleActive(widget) : onToggleVisibility(widget.id)}
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
                  onClick={() => onToggleActive(widget)}
                  className={`text-xs px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    isActive ? 'bg-black/10 dark:bg-white/10 hover:bg-rose-500 hover:text-white text-neutral-800 dark:text-neutral-200' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                  }`}
                >
                  {isActive ? 'Active' : '+ Add'}
                </button>
              </div>
            </div>
            <div className="flex items-end justify-between gap-1.5 h-16 px-2 pt-2">
              {WAVE_BARS.map((height, i) => (
                <div
                  key={i}
                  style={{ height: `${height}px` }}
                  className="flex-1 rounded-full bg-gradient-to-t from-purple-600 via-purple-400 to-indigo-200 dark:from-purple-500 dark:via-purple-300 dark:to-white transition-all duration-500 hover:opacity-80"
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 pt-1 font-mono">
              <span>Frequency: 1.0s interval</span>
              <span>Multi-core Load Normal</span>
            </div>
          </div>
        )

      case 'code':
        return (
          <div className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg shadow-black/10 dark:shadow-black/40 border border-white/10 bg-[#16171a] text-white p-3.5 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                  <FileText className="h-3 w-3 text-amber-400" />
                  <span>Quick Notes</span>
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight leading-tight mt-0.5">All Notes</h4>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#f8b825] flex items-center justify-center shadow-xs">
                  <Plus className="h-3.5 w-3.5 text-[#3d2700] stroke-[2.75]" />
                </div>
                <button
                  onClick={() => onToggleActive(widget)}
                  className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    isActive ? 'bg-white/10 hover:bg-rose-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm'
                  }`}
                >
                  {isActive ? 'Active' : '+ Add'}
                </button>
              </div>
            </div>
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
            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] text-neutral-400">
              <span className="flex items-center gap-1">
                <span className="h-1.5 rounded-full" />Auto-save active
              </span>
              <span className="font-mono">3 Notes</span>
            </div>
          </div>
        )

      case 'weather':
        return (
          <div className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg border border-white/10 bg-[#000000] p-2 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl text-white select-none">
            <div className="w-full bg-[#9db3c5] rounded-xl px-2.5 py-1.5 flex flex-col justify-between text-black">
              <div className="flex items-start justify-between leading-none">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-light tracking-tight font-sans" style={{ fontWeight: 300 }}>24°</span>
                    <CloudSun className="h-4 w-4 text-black fill-black" />
                  </div>
                  <span className="text-[9px] font-semibold text-black/85 mt-0.5">Partly Cloudy</span>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] font-bold">Amsterdam</span>
                  <span className="text-[8.5px] font-mono text-black/80 mt-0.5">H: 27° L: 23° ↗ 4</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-black/10 mt-1 text-[8px] font-mono">
                {[['Now', '20°'], ['14', '20°'], ['16', '20°'], ['18', '16°'], ['20', '15°'], ['22', '15°']].map(([h, t], i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className={i === 0 ? 'font-bold' : 'opacity-70'}>{h}</span>
                    <span className="font-semibold">{t}</span>
                  </div>
                ))}
              </div>
            </div>
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
              <div className="flex items-center justify-between pt-1 border-t border-white/[0.08] text-[9px]">
                <span className="text-[8.5px] font-mono text-neutral-400">58% Hum • 24°C</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onToggleVisibility(widget.id)}
                    disabled={!isActive}
                    className="text-[9px] text-white/70 hover:text-white disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-0.5"
                  >
                    {isHidden ? <><Eye className="h-2.5 w-2.5" /><span>Show</span></> : <><EyeOff className="h-2.5 w-2.5" /><span>Hide</span></>}
                  </button>
                  <button
                    onClick={() => onToggleActive(widget)}
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                      isActive ? 'bg-white/20 hover:bg-rose-500/80 text-white border border-white/30' : 'bg-white text-neutral-900 hover:bg-white/90 shadow-sm'
                    }`}
                  >
                    {isActive ? 'Active' : '+ Add'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'tasks':
        return (
          <div className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg shadow-black/10 dark:shadow-black/40 border border-white/20 bg-gradient-to-b from-[#6b8f6a] via-[#597858] to-[#435d42] p-2.5 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl text-white">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold text-white/95 drop-shadow-sm">Wed, 28 Oct</span>
              <div className="flex items-center gap-2">
                <div className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-white text-[10px] font-mono border border-white/30 shadow-xs">
                  17:22
                </div>
                <button
                  onClick={() => onToggleActive(widget)}
                  className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    isActive ? 'bg-black/30 hover:bg-rose-500 text-white' : 'bg-black/40 hover:bg-black/60 text-white border border-white/20 shadow-sm'
                  }`}
                >
                  {isActive ? 'Active' : '+ Add'}
                </button>
              </div>
            </div>
            <div className="w-full bg-[#19191b] rounded-xl p-2 space-y-1.5 shadow-md border border-white/10 my-0.5">
              <p className="text-xs font-bold text-white tracking-tight leading-none">Things to do Today</p>
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
                <span className="bg-[#28282c] px-2 py-0.5 rounded-full text-neutral-200 border border-white/10">+ Add Task</span>
              </div>
            </div>
          </div>
        )

      case 'dive':
        return (
          <div
            className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20 text-white p-3.5 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl cursor-default"
            style={{ background: 'linear-gradient(180deg, #4b4205 0%, #3e3604 50%, #302a03 100%)' }}
          >
            <div className="flex items-center justify-between z-10 w-full px-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Folder className="h-4 w-4 text-white/90 shrink-0" />
                <span className="font-bold text-lg text-white leading-none tracking-tight">Downloads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/30 border border-white/10 text-[10px] text-white/90">
                  <span>Downloading</span>
                </div>
                <button
                  onClick={() => onToggleActive(widget)}
                  className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    isActive ? 'bg-white/20 hover:bg-rose-500 text-white border border-white/20' : 'bg-[#edd75e] text-neutral-950 hover:bg-yellow-300 shadow-sm'
                  }`}
                >
                  {isActive ? 'Active' : '+ Add'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full h-[68px] z-10 my-auto">
              <div className="w-6 h-full flex flex-col justify-between items-start py-0.5 relative shrink-0">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="flex items-center w-full h-[2.5px]">
                    {i === 0 ? (
                      <div className="flex items-center w-full">
                        <svg width="6" height="7" viewBox="0 0 6 7" className="shrink-0 -ml-0.5">
                          <polygon points="0,0.5 5,3.5 0,6.5" fill="#ffffff" />
                        </svg>
                        <span className="flex-1 h-[2px] bg-white rounded-full ml-0.5" />
                      </div>
                    ) : (
                      <span className="w-3.5 h-[1.5px] rounded-full bg-[#756a28]/75 ml-1.5" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex-1 h-full rounded-xl px-2.5 py-1.5 flex flex-col justify-between shadow-inner overflow-hidden" style={{ background: '#241f02' }}>
                <div className="flex items-center gap-1 min-w-0">
                  <ArrowDown className="h-3 w-3 text-white stroke-[3] shrink-0" />
                  <span className="font-bold text-xs text-[#edd75e] truncate tracking-tight">setup_installer.dmg</span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-[#b8ad82] leading-none my-0.5">
                  <span className="truncate">Downloading package</span>
                  <span className="font-mono text-white/50 text-[8px]">12.4 MB/s</span>
                </div>
                <div className="w-full space-y-0.5">
                  <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="w-[78%] h-full bg-[#edd75e] rounded-full" />
                  </div>
                  <div className="flex justify-between text-[8px] text-[#b8ad82]/70 leading-none">
                    <span>142 MB / 180 MB</span>
                    <span className="font-mono">78%</span>
                  </div>
                </div>
              </div>
              <div className="w-14 h-full rounded-xl flex items-center justify-center shadow-inner relative shrink-0" style={{ background: '#241f02' }}>
                <svg width="34" height="34" viewBox="0 0 34 34" className="absolute inset-0 m-auto">
                  <circle cx="17" cy="17" r="12" fill="none" stroke="#edd75e" strokeWidth="2.8" strokeDasharray="56 20" strokeLinecap="round" transform="rotate(55 17 17)" />
                </svg>
                <Download className="h-3 w-3 text-white fill-white relative z-10" />
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-white/60 pt-0.5 border-t border-white/10">
              <span className="font-mono text-[#edd75e]/80">Downloads • Documents</span>
              <span className="text-white/40">320 × 180</span>
            </div>
          </div>
        )

      case 'duo':
        return (
          <div className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20 flex transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl cursor-default border border-black/5">
            <div className="w-[36%] h-full flex flex-col justify-between p-2.5 pt-3 select-none relative shrink-0" style={{ background: '#ffde00' }}>
              <div className="w-[98%] h-9 bg-black rounded-r-full flex items-center justify-between px-2.5 shadow-xs">
                <span className="text-white font-bold text-xl leading-none tabular-nums ml-0.5">23°</span>
                <CloudSun className="h-4 w-4 text-white stroke-[2.2] shrink-0" />
              </div>
              <div className="flex flex-col px-1">
                <span className="text-xs font-black text-neutral-950 leading-tight">Fair</span>
                <span className="text-[10px] font-bold text-neutral-900/90 leading-tight">L:19° H:27°</span>
              </div>
            </div>
            <div className="flex-1 h-full flex flex-col justify-between p-3 relative select-none" style={{ background: 'linear-gradient(135deg, #e4e7e9 0%, #dfe3e5 50%, #d8dcde 100%)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline tracking-tight">
                  <span className="text-xs font-black text-neutral-950 uppercase">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()},
                  </span>
                  <span className="text-xs font-bold text-neutral-800 uppercase ml-1">
                    {new Date().toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} {new Date().getDate()}
                  </span>
                </div>
                <button
                  onClick={() => onToggleActive(widget)}
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                    isActive ? 'bg-neutral-800 text-white' : 'bg-[#ffde00] text-neutral-950 hover:bg-yellow-300 shadow-xs'
                  }`}
                >
                  {isActive ? 'Active' : '+ Add'}
                </button>
              </div>
              <div className="w-full grid grid-cols-7 gap-y-0.5 text-center font-sans my-auto">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={i} className="text-[9px] font-black text-neutral-900/90 leading-none">{d}</span>
                ))}
                {[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].map((day) => {
                  const isToday = day === 17
                  const hasDot = day === 19 || day === 21 || day === 24
                  return (
                    <div key={day} className="flex flex-col items-center justify-center">
                      <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold leading-none ${isToday ? 'bg-[#ffde00] text-neutral-950' : 'text-neutral-900'}`}>
                        {day}
                      </span>
                      <span className={`w-0.5 h-0.5 rounded-full ${hasDot ? 'bg-[#7a858d]' : 'bg-transparent'}`} />
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center">
                <div className="w-[2.5px] h-4 bg-[#6c7782] rounded-full shrink-0 mr-1.5" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] font-semibold text-neutral-600 leading-none">19/10, 16:00</span>
                  <span className="text-[9px] font-black text-neutral-950 tracking-tight leading-none mt-0.5 truncate">
                    TOTTENHAM - ASTON VILLA
                  </span>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div
            className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20 text-white p-3.5 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl cursor-default"
            style={{ background: 'linear-gradient(180deg, #100b42 0%, #1a104c 25%, #351a66 60%, #582684 90%, #602888 100%)' }}
          >
            <div className="flex items-baseline justify-between z-10">
              <div className="flex items-baseline tracking-tight font-sans">
                <span className="font-bold text-lg text-white leading-none">10</span>
                <span className="text-[10px] font-bold text-[#8071ad] uppercase ml-0.5 mr-1.5 leading-none">MB</span>
                <span className="font-bold text-lg text-white leading-none">23</span>
                <span className="text-[10px] font-bold text-[#8071ad] uppercase ml-0.5 leading-none">KB</span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#d482ec] leading-none">INTERNET</span>
            </div>
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
                <polygon points="94,42 98,37 92,34" fill="#ffffff" />
                <circle cx="95" cy="40" r="1.8" fill="#ffffff" />
              </svg>
            </div>
            <div className="flex items-center justify-between z-10 pt-1">
              <span className="text-[11px] font-bold text-[#9d6bb1] font-mono leading-none">12kb</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
                <div className="flex items-end gap-[2px] h-2.5">
                  {[40, 75, 100, 60, 45].map((h, idx) => (
                    <span key={idx} className="w-[2px] rounded-full" style={{ height: `${h}%`, background: idx === 2 ? '#d482ec' : idx % 2 === 0 ? '#a875db' : '#785498' }} />
                  ))}
                </div>
                <span className="text-[9px] font-mono text-[#cfb0f5] leading-none">21ms</span>
              </div>
              <button
                onClick={() => onToggleActive(widget)}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  isActive ? 'bg-white/20 hover:bg-rose-500 text-white border border-white/20' : 'bg-white text-neutral-900 hover:bg-white/90 shadow-sm'
                }`}
              >
                {isActive ? 'Active' : '+ Add'}
              </button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className={`flex flex-col items-center group ${isEqualizer ? 'col-span-1 sm:col-span-2' : ''}`}>
      {renderCardContent()}
      <span className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors">
        {widget.caption}
      </span>
    </div>
  )
}, (prev, next) => {
  if (prev.isActive !== next.isActive || prev.isHidden !== next.isHidden || prev.widget !== next.widget) {
    return false
  }
  if (prev.widget.cardStyle === 'canyon') {
    return prev.formattedTime === next.formattedTime && prev.currentSeconds === next.currentSeconds
  }
  return true
})

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
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false)
  const [cardScale, setCardScale] = useState<'normal' | 'compact' | 'large'>('normal')
  const [copiedShare, setCopiedShare] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  const isAllHidden = activeWidgets.length > 0 && activeWidgets.every((id) => hiddenWidgetIds.has(id))
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Global shortcut: Cmd+F or Ctrl+F to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
      if (Array.isArray(items)) {
        setPersistedWidgets(items)
        const hidden = items.filter((i) => i?.isVisible === false).map((i) => i.id)
        if (hidden.length) setHiddenWidgetIds((prev) => new Set([...prev, ...hidden]))
      }
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

  // Parallel bulk window visibility toggling
  const handleToggleAllVisibility = async (): Promise<void> => {
    const allHidden = activeWidgets.every((id) => hiddenWidgetIds.has(id))
    await Promise.all(
      activeWidgets.map((id) => allHidden ? window.api?.showWidget?.(id) : window.api?.hideWidget?.(id))
    )
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

  const activeWidgetSet = useMemo(() => new Set(activeWidgets), [activeWidgets])

  // Optimized O(1) filter with pre-computed lowercase query
  const filteredWidgets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return WIDGET_CATALOG.filter((w) => {
      const matchesCat =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'active'
            ? activeWidgetSet.has(w.id)
            : w.cat === selectedCategory

      if (!matchesCat) return false
      if (!q) return true

      return (
        w.name.toLowerCase().includes(q) ||
        w.desc.toLowerCase().includes(q) ||
        w.caption.toLowerCase().includes(q)
      )
    })
  }, [selectedCategory, searchQuery, activeWidgetSet])

  // Category view title using lookup map
  const viewTitle = useMemo(() => {
    const q = searchQuery.trim()
    return q ? `Results for "${q}"` : (CATEGORY_TITLES[selectedCategory] || 'Documents')
  }, [selectedCategory, searchQuery])

  // Formatted digital time and memoized second tick
  const formattedTime = useMemo(() => currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), [currentTime])
  const formattedDate = useMemo(() => currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }), [currentTime])
  const currentSeconds = useMemo(() => currentTime.getSeconds().toString().padStart(2, '0'), [currentTime])

  const isClockActive = activeWidgetSet.has(DIGITAL_CLOCK_WIDGET_ID)

  return (
    <div className="h-screen w-screen flex bg-[#ececec] dark:bg-[#121316] text-neutral-800 dark:text-neutral-200 select-none overflow-hidden font-sans antialiased transition-colors duration-200">

      {/* ========================================================
          LEFT SIDEBAR (macOS Translucent Frosted Sidebar)
          ======================================================== */}
      <aside className="w-56 shrink-0 flex flex-col bg-[#e7e7eb]/80 dark:bg-[#1a1b20]/80 backdrop-blur-2xl border-r border-black/[0.08] dark:border-white/[0.08] transition-colors relative z-20">

        {/* macOS Traffic Lights Margin / Window Drag Area */}
        <div className="titlebar-drag-region h-11 w-full flex items-center px-4 gap-2">
          {appInfo?.platform !== 'darwin' && (
            <div className="titlebar-no-drag flex items-center gap-2">
              <button onClick={() => window.api?.hideWindow?.()} className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-90 transition-all cursor-pointer" title="Close / Hide" />
              <button onClick={() => window.api?.hideWindow?.()} className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-90 transition-all cursor-pointer" title="Minimize" />
              <button className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-90 transition-all cursor-pointer" title="Zoom" />
            </div>
          )}
        </div>

        {/* macOS Toolbar Row (Back, Share, QuickLook, Tag, Search) */}
        <div className="titlebar-no-drag px-3 pb-2.5 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06]">
          <button
            onClick={() => { setSelectedCategory("all"); setSearchQuery("") }}
            className={`w-7 h-7 flex items-center justify-center rounded-[6px] transition-all cursor-pointer active:scale-95 ${
              selectedCategory !== "all" || searchQuery
                ? "text-neutral-800 dark:text-neutral-200 hover:bg-black/[0.05] dark:hover:bg-white/10"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/10"
            }`}
            title="All Widgets (Back)"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <button
            onClick={handleShareCreator}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer relative"
            title="Share / Copy Link"
          >
            {copiedShare ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
          </button>

          <button
            onClick={handleToggleAllVisibility}
            className={`w-7 h-7 flex items-center justify-center rounded-[6px] transition-all cursor-pointer active:scale-95 ${
              isAllHidden
                ? "bg-amber-500/15 text-amber-500"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/10"
            }`}
            title={isAllHidden ? "Show All Desktop Widgets" : "Hide All Desktop Widgets"}
          >
            {isAllHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setSelectedCategory((prev) => prev === "active" ? "all" : "active")}
            className={`w-7 h-7 flex items-center justify-center rounded-[6px] transition-all cursor-pointer active:scale-95 ${
              selectedCategory === "active"
                ? "bg-[#007aff]/15 text-[#007aff] dark:text-[#0a84ff]"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/10"
            }`}
            title="Filter Active Widgets"
          >
            <Tag className="h-4 w-4" />
          </button>

          <button
            onClick={() => {
              searchInputRef.current?.focus()
              searchInputRef.current?.select()
            }}
            className={`w-7 h-7 flex items-center justify-center rounded-[6px] transition-all cursor-pointer active:scale-95 ${
              isSearchFocused || searchQuery
                ? "bg-[#007aff]/15 text-[#007aff] dark:text-[#0a84ff]"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/10"
            }`}
            title="Search Widgets (Cmd+F)"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-[13px] font-normal">
          {([
            { id: 'all', label: 'All My Files', icon: LayoutGrid, count: WIDGET_CATALOG.length },
            { id: 'active', label: 'Active on Desktop', icon: Monitor, count: activeWidgets.length, isPill: true },
            { id: 'Time & Date', label: 'Time & Date', icon: Clock, count: WIDGET_CATALOG.filter(w => w.cat === 'Time & Date').length },
            { id: 'Productivity', label: 'Documents', icon: FileText, count: WIDGET_CATALOG.filter(w => w.cat === 'Productivity').length },
            { id: 'Hardware & System', label: 'Applications', icon: Cpu, count: WIDGET_CATALOG.filter(w => w.cat === 'Hardware & System').length },
            { id: 'Information & Forecast', label: 'Live Weather', icon: CloudSun, count: WIDGET_CATALOG.filter(w => w.cat === 'Information & Forecast').length },
            { id: 'Media & Gallery', label: 'Downloads / Media', icon: ImageIcon, count: WIDGET_CATALOG.filter(w => w.cat === 'Media & Gallery').length }
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

          {/* Settings Trigger & Theme Switcher */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              title="Settings & System Diagnostics"
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
            {/* Search Input Bar (Always visible & active) */}
            <div className="relative flex items-center">
              <Search className="h-3.5 w-3.5 text-neutral-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search widgets, music, notes..."
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-8 pr-7 text-xs rounded-md bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-900 dark:text-white placeholder-neutral-400 w-52 sm:w-60 transition-all leading-none"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    searchInputRef.current?.focus()
                  }}
                  className="absolute right-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Quick Add Button */}
            <button
              onClick={() => !isClockActive ? handleCreateWidget(WIDGET_CATALOG[1]) : handleCreateWidget(filteredWidgets[0] || WIDGET_CATALOG[0])}
              className="h-7 inline-flex items-center gap-1.5 px-3 rounded-md bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-medium shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{!isClockActive ? 'Add Digital Clock' : 'Add Widget'}</span>
            </button>
          </div>
        </header>

        {/* Content Body: Media Cards Canvas (Optimized Grid & Memoized Cards) */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className={`grid gap-6 ${cardScale === 'compact'
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
            : cardScale === 'large'
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
            {filteredWidgets.map((widget) => (
              <WidgetPreviewCard
                key={widget.id}
                widget={widget}
                isActive={activeWidgetSet.has(widget.id)}
                isHidden={hiddenWidgetIds.has(widget.id)}
                formattedDate={formattedDate}
                formattedTime={formattedTime}
                currentSeconds={currentSeconds}
                onToggleActive={(w) => !activeWidgetSet.has(w.id) ? handleCreateWidget(w) : handleRemoveWidget(w.id)}
                onToggleVisibility={handleToggleWidgetVisibility}
              />
            ))}
          </div>
        </div>

        {/* ========================================================
            BOTTOM STATUS BAR (macOS Finder slider + Breadcrumb)
            ======================================================== */}
        <footer className="h-11 shrink-0 px-8 flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-black/20 backdrop-blur-xl text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleStartup}
              disabled={isUpdatingStartup || !startupSettings?.isSupported}
              className="flex items-center gap-1.5 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              title="Click to toggle Launch at Login"
            >
              <span className="text-[11px]">
                {isUpdatingStartup ? 'Saving...' : startupSettings?.openAtLogin ? 'Login Startup: Enabled' : 'Login Startup: Disabled'}
              </span>
            </button>
          </div>

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
          SETTINGS & CREATOR MODAL (Native Apple macOS System Settings UI)
          ======================================================== */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-[#f6f6f8] dark:bg-[#1e1e22] rounded-2xl shadow-2xl border border-black/15 dark:border-white/10 flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* macOS Window Titlebar with Traffic Lights */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-black/[0.07] dark:border-white/[0.08] select-none bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-2 w-20">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-90 transition-all cursor-pointer flex items-center justify-center group"
                  title="Close"
                >
                  <X className="w-2 h-2 text-[#4a0002] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-90 transition-all cursor-pointer"
                  title="Minimize"
                />
                <button
                  className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] opacity-40 cursor-default"
                  title="Zoom"
                />
              </div>

              <span className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                System Settings
              </span>

              <div className="w-20 flex justify-end">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="h-6 px-3 rounded-[6px] bg-[#007aff] hover:bg-[#006ee6] active:scale-95 text-white text-xs font-medium shadow-xs transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Modal Body: macOS System Settings Panes */}
            <div className="p-5 overflow-y-auto space-y-4 text-[13px]">
              {/* Apple Account / Creator Profile Header */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#252529] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white/20 shrink-0">
                    ZR
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        Zeesu Royalist
                      </h3>
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                        Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      Founder & Creator of Z-Widgets
                    </p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono mt-0.5 truncate">
                      zeesu-royalist.vercel.app
                    </p>
                  </div>
                </div>

                <a
                  href="https://zeesu-royalist.vercel.app"
                  target="_blank"
                  rel="noreferrer"
                  className="h-7 px-3 inline-flex items-center gap-1 text-xs font-medium rounded-md bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 active:scale-95 transition-all cursor-pointer shrink-0 ml-2"
                  title="Search 'Zeesu Royalist' on Google or ask any AI"
                >
                  <span>Profile</span>
                  <ChevronRight className="h-3 w-3 text-neutral-400" />
                </a>
              </div>

              {/* General Settings Group */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 px-1 uppercase tracking-wider">
                  General
                </span>
                <div className="rounded-xl bg-white dark:bg-[#252529] border border-black/[0.06] dark:border-white/[0.08] shadow-xs divide-y divide-black/[0.05] dark:divide-white/[0.06] overflow-hidden">
                  {/* Row 1: Launch at Login with Apple Toggle Switch */}
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-[7px] bg-gradient-to-b from-indigo-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Power className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                          Launch at Login
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                          Start Z-Widgets in background automatically on login
                        </p>
                        {!startupSettings?.isPackaged && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            Dev mode: Saved locally without registry modifications
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Apple macOS Green/Gray Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(startupSettings?.openAtLogin)}
                      disabled={isUpdatingStartup || !startupSettings?.isSupported}
                      onClick={handleToggleStartup}
                      className={`w-[38px] h-[22px] rounded-full p-[2px] transition-colors duration-200 ease-in-out cursor-pointer relative shrink-0 focus:outline-none disabled:opacity-50 ${
                        startupSettings?.openAtLogin ? 'bg-[#34c759]' : 'bg-black/15 dark:bg-white/20'
                      }`}
                      title={startupSettings?.openAtLogin ? 'Disable Launch at Login' : 'Enable Launch at Login'}
                    >
                      <span
                        className={`block w-[18px] h-[18px] rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
                          startupSettings?.openAtLogin ? 'translate-x-[16px]' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Row 2: Dark Mode with Apple Round Toggle Switch */}
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`w-7 h-7 rounded-[7px] text-white flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                        isDarkMode
                          ? 'bg-gradient-to-b from-blue-600 to-indigo-600'
                          : 'bg-gradient-to-b from-amber-400 to-amber-500'
                      }`}>
                        {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                          Dark Mode
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                          {isDarkMode ? 'Dark appearance active for window and desktop' : 'Light appearance active for window and desktop'}
                        </p>
                      </div>
                    </div>

                    {/* Apple macOS Round On/Off Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isDarkMode}
                      onClick={() => setIsDarkMode((prev) => !prev)}
                      className={`w-[38px] h-[22px] rounded-full p-[2px] transition-colors duration-200 ease-in-out cursor-pointer relative shrink-0 focus:outline-none ${
                        isDarkMode ? 'bg-[#34c759]' : 'bg-black/15 dark:bg-white/20'
                      }`}
                      title={isDarkMode ? 'Disable Dark Mode (Switch to Light)' : 'Enable Dark Mode'}
                    >
                      <span
                        className={`block w-[18px] h-[18px] rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
                          isDarkMode ? 'translate-x-[16px]' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Display & Topology Group */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 px-1 uppercase tracking-wider">
                  Display & Monitors
                </span>
                <div className="rounded-xl bg-white dark:bg-[#252529] border border-black/[0.06] dark:border-white/[0.08] shadow-xs divide-y divide-black/[0.05] dark:divide-white/[0.06] overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-[7px] bg-gradient-to-b from-blue-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <RotateCcw className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                          Multi-Monitor Position Recovery
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                          Rescue orphaned off-screen widgets back to primary display
                        </p>
                        {recoveryFeedback && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="h-3 w-3" />
                            {recoveryFeedback}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleRecoverDisplays}
                      disabled={isRecovering}
                      className="h-7 px-3 inline-flex items-center gap-1.5 text-xs font-medium rounded-md bg-white dark:bg-[#323236] border border-black/15 dark:border-white/15 text-neutral-800 dark:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <RotateCcw className={`h-3 w-3 ${isRecovering ? 'animate-spin' : ''}`} />
                      <span>{isRecovering ? 'Scanning...' : 'Recover'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* System Diagnostics & Information Disclosure */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setShowDiag((prev) => !prev)}
                  className="w-full flex items-center justify-between px-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  <span>System Diagnostics & IPC</span>
                  {showDiag ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showDiag && (
                  <div className="rounded-xl bg-white dark:bg-[#252529] border border-black/[0.06] dark:border-white/[0.08] shadow-xs p-3 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600 dark:text-neutral-300 font-mono">
                      <div className="flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.04] p-1.5 rounded-md border border-black/[0.04] dark:border-white/[0.04]">
                        <Monitor className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">Platform: {appInfo?.platform || 'darwin'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.04] p-1.5 rounded-md border border-black/[0.04] dark:border-white/[0.04]">
                        <Cpu className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">Electron: {appInfo?.electronVersion || 'v...'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.04] p-1.5 rounded-md border border-black/[0.04] dark:border-white/[0.04]">
                        <Terminal className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">Chromium: {appInfo?.chromeVersion || 'v...'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.04] p-1.5 rounded-md border border-black/[0.04] dark:border-white/[0.04]">
                        <Zap className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">Node: {appInfo?.nodeVersion || 'v...'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
                      <span className="text-[11px] text-neutral-400 font-mono truncate max-w-[200px]" title={ipcStatus}>
                        {ipcStatus}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handlePing}
                          disabled={isPinging}
                          className="h-6 px-2.5 inline-flex items-center rounded-md bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isPinging ? 'Pinging...' : 'Test IPC'}
                        </button>
                        <button
                          onClick={() => window.api?.hideWindow?.()}
                          className="h-6 px-2.5 inline-flex items-center gap-1 rounded-md bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                        >
                          <Minimize2 className="h-3 w-3" />
                          <span>Hide to Tray</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
