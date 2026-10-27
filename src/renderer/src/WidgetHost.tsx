import React, { useEffect, useState } from 'react'
import { Sparkles, X, AppWindow, ShieldCheck } from 'lucide-react'
import { DigitalClockWidget } from './widgets/DigitalClockWidget'
import { QuickNotesWidget } from './widgets/QuickNotesWidget'
import { TodoListWidget } from './widgets/TodoListWidget'
import { SystemMonitorWidget } from './widgets/SystemMonitorWidget'
import { WeatherWidget } from './widgets/WeatherWidget'
import { PhotoWidget } from './widgets/PhotoWidget'
import {
  DEV_TEST_WIDGET_ID, WIDGET_TYPE_CLOCK, WIDGET_TYPE_NOTES,
  WIDGET_TYPE_TODO, WIDGET_TYPE_SYSTEM, WIDGET_TYPE_WEATHER, WIDGET_TYPE_PHOTO
} from '../../shared/constants'

const WIDGET_COMPONENTS: Record<string, React.ComponentType<{ widgetId: string; onClose?: () => Promise<void> }>> = {
  [WIDGET_TYPE_CLOCK]: DigitalClockWidget,
  [WIDGET_TYPE_NOTES]: QuickNotesWidget,
  [WIDGET_TYPE_TODO]: TodoListWidget,
  [WIDGET_TYPE_SYSTEM]: SystemMonitorWidget,
  [WIDGET_TYPE_WEATHER]: WeatherWidget,
  [WIDGET_TYPE_PHOTO]: PhotoWidget
}

const TYPE_PREFIXES: [string, string][] = [
  ['clock', WIDGET_TYPE_CLOCK], ['note', WIDGET_TYPE_NOTES],
  ['todo', WIDGET_TYPE_TODO], ['system', WIDGET_TYPE_SYSTEM],
  ['weather', WIDGET_TYPE_WEATHER], ['photo', WIDGET_TYPE_PHOTO]
]

interface ParsedWidgetRoute { id: string; type: string }

function parseHashRoute(): ParsedWidgetRoute {
  if (typeof window === 'undefined') return { id: 'widget-host', type: 'standard' }
  const hash = window.location.hash || '', prefix = '#/widget/'
  if (!hash.startsWith(prefix)) return { id: 'widget-host', type: 'standard' }

  const [rawId, rawQuery] = hash.slice(prefix.length).split('?')
  const extractedId = decodeURIComponent(rawId || '')
  let extractedType = rawQuery ? new URLSearchParams(rawQuery).get('type') || 'standard' : 'standard'

  if (extractedType === 'standard') {
    extractedType = TYPE_PREFIXES.find(([p]) => extractedId.startsWith(p))?.[1] || (extractedId === DEV_TEST_WIDGET_ID ? 'test' : 'standard')
  }
  return { id: extractedId || 'widget-host', type: extractedType }
}

export const WidgetHost: React.FC = () => {
  const [routeInfo, setRouteInfo] = useState<ParsedWidgetRoute>(() => parseHashRoute())
  const { id: widgetId, type: widgetType } = routeInfo

  useEffect(() => {
    document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches)
    const onHashChange = (): void => setRouteInfo(parseHashRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleClose = async (): Promise<void> => {
    try {
      if (window.api?.closeSelf) await window.api.closeSelf()
      else if (window.api?.closeWidget) await window.api.closeWidget(widgetId)
    } catch {
      window.api?.closeWidget?.(widgetId).catch(() => {})
    }
  }

  const Component = WIDGET_COMPONENTS[widgetType]
  if (Component) return <Component widgetId={widgetId} onClose={handleClose} />

  return (
    <div className="w-screen h-screen p-3 flex items-center justify-center bg-transparent select-none overflow-hidden font-sans">
      <div className="titlebar-drag-region w-full h-full glass-panel rounded-apple-xl p-4 flex flex-col justify-between shadow-glass-light dark:shadow-glass-dark border border-black/10 dark:border-white/10 transition-all cursor-move">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <AppWindow className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block leading-tight">
                {widgetId === DEV_TEST_WIDGET_ID ? 'Dev Test Host' : 'Widget Host'}
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-mono">id: {widgetId}</span>
            </div>
          </div>
          <button onClick={handleClose} aria-label="Close widget" title="Close widget" className="titlebar-no-drag p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="my-2 p-2.5 rounded-apple-sm bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Interactive & Frameless</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" /> Active Host
          </span>
        </div>
        <div className="text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center justify-between">
          <span>Least-Privilege Host</span><span>Z-Widgets</span>
        </div>
      </div>
    </div>
  )
}

