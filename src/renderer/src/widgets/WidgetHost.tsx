import React, { useEffect, useState } from 'react'
import { DigitalClockWidget } from './DigitalClockWidget'
import { QuickNotesWidget } from './QuickNotesWidget'
import { TodoListWidget } from './TodoListWidget'
import { SystemMonitorWidget } from './SystemMonitorWidget'
import { WeatherWidget } from './WeatherWidget'
import { PhotoWidget } from './PhotoWidget'
import { InternetTelemetryWidget } from './InternetTelemetryWidget'
import { DepthDiveWidget } from './DepthDiveWidget'
import {
  DEV_TEST_WIDGET_ID, WIDGET_TYPE_CLOCK, WIDGET_TYPE_NOTES,
  WIDGET_TYPE_TODO, WIDGET_TYPE_SYSTEM, WIDGET_TYPE_WEATHER,
  WIDGET_TYPE_PHOTO, WIDGET_TYPE_TEST, WIDGET_TYPE_DEPTH
} from '../../../shared/constants'

const WIDGET_COMPONENTS: Record<string, React.ComponentType<{ widgetId: string; onClose?: () => Promise<void> }>> = {
  [WIDGET_TYPE_CLOCK]: DigitalClockWidget,
  [WIDGET_TYPE_NOTES]: QuickNotesWidget,
  [WIDGET_TYPE_TODO]: TodoListWidget,
  [WIDGET_TYPE_SYSTEM]: SystemMonitorWidget,
  [WIDGET_TYPE_WEATHER]: WeatherWidget,
  [WIDGET_TYPE_PHOTO]: PhotoWidget,
  [WIDGET_TYPE_TEST]: InternetTelemetryWidget,
  [WIDGET_TYPE_DEPTH]: DepthDiveWidget
}

const TYPE_PREFIXES: [string, string][] = [
  ['clock', WIDGET_TYPE_CLOCK], ['note', WIDGET_TYPE_NOTES],
  ['todo', WIDGET_TYPE_TODO], ['system', WIDGET_TYPE_SYSTEM],
  ['weather', WIDGET_TYPE_WEATHER], ['photo', WIDGET_TYPE_PHOTO],
  ['internet', WIDGET_TYPE_TEST], ['test', WIDGET_TYPE_TEST],
  ['depth', WIDGET_TYPE_DEPTH], ['dive', WIDGET_TYPE_DEPTH]
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
    extractedType = TYPE_PREFIXES.find(([p]) => extractedId.startsWith(p))?.[1] || (extractedId === DEV_TEST_WIDGET_ID ? WIDGET_TYPE_TEST : 'standard')
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

  const Component = WIDGET_COMPONENTS[widgetType] || InternetTelemetryWidget
  return <Component widgetId={widgetId} onClose={handleClose} />
}

