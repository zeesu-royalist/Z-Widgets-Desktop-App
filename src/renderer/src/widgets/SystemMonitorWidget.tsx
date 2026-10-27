import React, { useState, useEffect } from 'react'
import { Cpu, X, Activity, HardDrive, Clock } from 'lucide-react'
import { SystemStats } from '../../../shared/types'

interface SystemMonitorWidgetProps {
  widgetId: string
  onClose?: () => Promise<void>
}

export const SystemMonitorWidget: React.FC<SystemMonitorWidgetProps> = ({ widgetId, onClose }) => {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  useEffect(() => {
    let isMounted = true
    const fetchStats = async (): Promise<void> => {
      try {
        const data = await window.api?.getSystemStats?.()
        if (isMounted && data) { setStats(data); setIsLoaded(true) }
      } catch (err) {
        console.error('[SYSTEM_MONITOR] Failed to fetch system stats:', err)
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 2000)
    return () => { isMounted = false; clearInterval(interval) }
  }, [])

  const handleClose = async (): Promise<void> => {
    if (onClose) return onClose()
    try { await (window.api?.closeSelf?.() ?? window.api?.closeWidget?.(widgetId)) }
    catch { window.api?.closeWidget?.(widgetId) }
  }

  const cpuPercent = stats?.cpuUsage ?? 0
  const memPercent = stats?.memUsage ?? 0

  const cpuColor = cpuPercent >= 80 ? 'bg-rose-500' : cpuPercent >= 50 ? 'bg-amber-500' : 'bg-cyan-500'
  const memColor = memPercent >= 85 ? 'bg-rose-500' : memPercent >= 65 ? 'bg-amber-500' : 'bg-indigo-500'

  return (
    <div className="w-screen h-screen p-2.5 flex items-center justify-center bg-transparent select-none overflow-hidden font-sans">
      <div className="w-full h-full glass-panel rounded-apple-xl p-4 flex flex-col justify-between shadow-glass-light dark:shadow-glass-dark border border-black/10 dark:border-white/10 relative group transition-all">
        {/* Top Header Row */}
        <div className="titlebar-drag-region flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06] z-10 cursor-move">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
            <div className="p-1 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Cpu className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-800 dark:text-neutral-200">
              System Monitor
            </span>
          </div>

          <div className="titlebar-no-drag flex items-center gap-2">
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>

            <button
              onClick={handleClose}
              aria-label="Close system monitor widget"
              title="Close widget"
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Central Resource Metrics Body */}
        <div className="titlebar-no-drag my-2 space-y-2.5 flex-1 justify-center flex flex-col select-text">
          {[
            {
              Icon: Activity,
              label: 'CPU Load',
              color: 'text-cyan-500',
              barColor: cpuColor,
              percent: cpuPercent,
              leftSub: stats?.cpuModel || 'Apple Processor',
              rightSub: stats?.cpuCores ? `${stats.cpuCores} Cores` : ''
            },
            {
              Icon: HardDrive,
              label: 'Memory (RAM)',
              color: 'text-indigo-500',
              barColor: memColor,
              percent: memPercent,
              leftSub: `Used: ${stats ? `${stats.usedMemGB} GB` : '...'}`,
              rightSub: `Total: ${stats ? `${stats.totalMemGB} GB` : '...'}`
            }
          ].map((m, i) => (
            <div key={i} className="p-2 rounded-apple-sm bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300 font-medium">
                  <m.Icon className={`h-3.5 w-3.5 ${m.color}`} />
                  <span>{m.label}</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-neutral-800 dark:text-neutral-100">
                  {isLoaded ? `${m.percent}%` : '...'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${m.barColor}`}
                  style={{ width: `${Math.min(100, Math.max(2, m.percent))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-0.5">
                <span className="truncate max-w-[190px]">{m.leftSub}</span>
                <span>{m.rightSub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Footer: Uptime & App Info */}
        <div className="titlebar-drag-region flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 pt-1.5 border-t border-black/[0.04] dark:border-white/[0.04] z-10 cursor-move">
          <span className="flex items-center gap-1 font-mono">
            <Clock className="h-3 w-3 text-neutral-400" />
            Up: {stats?.uptimeFormatted || '0m'}
          </span>
          <span className="font-mono text-neutral-400">
            Z-Widgets
          </span>
        </div>
      </div>
    </div>
  )
}
