import React, { useState, useEffect, useMemo } from 'react'
import { Activity, Clock } from 'lucide-react'
import { SystemStats } from '../../../shared/types'

interface SystemMonitorWidgetProps {
  widgetId: string
  onClose?: () => Promise<void>
}

// Geometry constants for 240-degree horseshoe arc (sweeping from 150° to 390°)
const R = 44
const CX = 65
const CY = 62
const CIRCUMFERENCE = 2 * Math.PI * R // ~276.46
const ARC_ANGLE = 240
const ARC_LENGTH = (ARC_ANGLE / 360) * CIRCUMFERENCE // ~184.3
const TOTAL_DASH = `${ARC_LENGTH} ${CIRCUMFERENCE}`

export const SystemMonitorWidget: React.FC<SystemMonitorWidgetProps> = ({ widgetId, onClose }) => {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const [showFreeMetrics, setShowFreeMetrics] = useState<boolean>(false)
  const [now, setNow] = useState<Date>(() => new Date())

  // Live clock for top header time display (matching 10:09 in image)
  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(clockTimer)
  }, [])

  const timeStr = useMemo(() => {
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }, [now])

  useEffect(() => {
    let isMounted = true
    const fetchStats = async (): Promise<void> => {
      try {
        const data = await window.api?.getSystemStats?.()
        if (isMounted && data) {
          setStats(data)
          setIsLoaded(true)
        }
      } catch (err) {
        console.error('[SYSTEM_MONITOR] Failed to fetch system stats:', err)
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 2000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const handleClose = async (): Promise<void> => {
    if (onClose) return onClose()
    try {
      await (window.api?.closeSelf?.() ?? window.api?.closeWidget?.(widgetId))
    } catch {
      window.api?.closeWidget?.(widgetId)
    }
  }

  const handleRootDoubleClick = (e: React.MouseEvent): void => {
    // Prevent accidental close when clicking on any button or non-drag interactive elements
    if ((e.target as HTMLElement).closest('button, .titlebar-no-drag, input, select, textarea, a')) {
      return
    }
    handleClose()
  }

  const handleToggleMetrics = async (e?: React.MouseEvent): Promise<void> => {
    if (e) {
      e.stopPropagation()
    }
    setShowFreeMetrics((prev) => !prev)
    try {
      const data = await window.api?.getSystemStats?.()
      if (data) setStats(data)
    } catch { }
  }

  const cpuPercent = stats?.cpuUsage ?? 0
  const memPercent = stats?.memUsage ?? 0
  const usedGBNum = stats?.usedMemGB ?? 0
  const totalGBNum = stats?.totalMemGB ?? 16
  const freeGBStr = Math.max(0, totalGBNum - usedGBNum).toFixed(1)

  // Calculate Dashoffset and Tip Indicator coordinates for CPU
  const cpuClamped = Math.max(0, Math.min(100, cpuPercent))
  const cpuOffset = ARC_LENGTH * (1 - cpuClamped / 100)
  const cpuAngleDeg = 150 + ARC_ANGLE * (cpuClamped / 100)
  const cpuAngleRad = (cpuAngleDeg * Math.PI) / 180
  const cpuTipX = CX + R * Math.cos(cpuAngleRad)
  const cpuTipY = CY + R * Math.sin(cpuAngleRad)

  // Calculate Dashoffset and Tip Indicator coordinates for Memory
  const memClamped = Math.max(0, Math.min(100, memPercent))
  const memOffset = ARC_LENGTH * (1 - memClamped / 100)
  const memAngleDeg = 150 + ARC_ANGLE * (memClamped / 100)
  const memAngleRad = (memAngleDeg * Math.PI) / 180
  const memTipX = CX + R * Math.cos(memAngleRad)
  const memTipY = CY + R * Math.sin(memAngleRad)

  return (
    <div
      onDoubleClick={handleRootDoubleClick}
      title="System Resource Monitor (Double-click background to close)"
      className="titlebar-drag-region w-screen h-screen flex bg-transparent select-none overflow-hidden font-sans"
    >
      {/* Rectangular Deep Dark Emerald Chassis - Inspired by Reference Widget */}
      <div className="w-full h-full bg-gradient-to-b from-[#0a1810] via-[#08140e] to-[#040b07] rounded-[28px] p-3 flex flex-col justify-between border border-emerald-500/20 shadow-none text-white relative group overflow-hidden select-none">

        {/* Ambient Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-emerald-500/10 blur-2xl pointer-events-none rounded-full" />

        {/* ================================================================= */}
        {/* TOP HEADER: Circular Close Button, Time & Title, Activity Icon    */}
        {/* ================================================================= */}
        <div className="titlebar-drag-region flex items-center justify-between px-1 z-10 shrink-0">
          {/* Top Left: Dummy UI Badge from Reference Image (No Action) */}
          <div
            title="Telemetry Status"
            className="titlebar-no-drag select-none cursor-default w-[42px] h-[42px]"
          >
            <svg viewBox="0 0 200 200" width="100%" height="100%">
              <defs>
                <radialGradient id="tg-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#03120a" />
                  <stop offset="55%" stopColor="#06210f" />
                  <stop offset="85%" stopColor="#0a3a1c" />
                  <stop offset="100%" stopColor="#22c55e" />
                </radialGradient>
                <path id="tg-mins" d="M 75.34 135.22 A 43 43 0 0 0 124.66 135.22" />
              </defs>

              {/* bahar ka dark ring */}
              <path d="M 36.36 163.64 A 90 90 0 1 1 163.64 163.64" fill="none" stroke="#1c1c1e" strokeWidth="13" strokeLinecap="round" />

              {/* grey track */}
              <path d="M 47.67 152.33 A 74 74 0 1 1 152.33 152.33" fill="none" stroke="#2c2c2e" strokeWidth="18" strokeLinecap="round" />

              {/* chhote dots */}
              <circle cx="35.92" cy="137" r="1.6" fill="#6b6b70" />
              <circle cx="26" cy="100" r="1.6" fill="#6b6b70" />
              <circle cx="100" cy="26" r="1.6" fill="#6b6b70" />
              <circle cx="174" cy="100" r="1.6" fill="#6b6b70" />
              <circle cx="164.08" cy="137" r="1.6" fill="#6b6b70" />

              {/* green arc + white dot */}
              <path d="M 47.67 47.67 A 74 74 0 0 1 152.33 47.67" fill="none" stroke="#22c55e" strokeWidth="16" strokeLinecap="round" />
              <circle cx="152.33" cy="47.67" r="3.6" fill="#fff" />

              {/* L / H */}
              <text x="47.67" y="152.33" textAnchor="middle" dy=".35em" fontSize="10" fontWeight="500" fill="#8e8e93">L</text>
              <text x="152.33" y="152.33" textAnchor="middle" dy=".35em" fontSize="10" fontWeight="500" fill="#8e8e93">H</text>

              {/* beech ka glowing circle */}
              <circle cx="100" cy="100" r="52" fill="url(#tg-glow)" />

              {/* bada number */}
              <text x="100" y="113" textAnchor="middle" fontSize="36" fontWeight="500" fill="#fff">28</text>

              {/* curved "15 mins" */}
              <text fontSize="12" fontWeight="500" fill="#4ade80">
                <textPath href="#tg-mins" startOffset="50%" textAnchor="middle">15 mins</textPath>
              </text>

              {/* "24" badge */}
              <circle cx="47.67" cy="47.67" r="20" fill="#16a34a" stroke="#fff" strokeWidth="2.5" />
              <text x="47.67" y="47.67" textAnchor="middle" dy=".35em" fontSize="22" fontWeight="600" fill="#fff">24</text>
            </svg>
          </div>

          {/* Top Center: 10:09 & Battery Style Title */}
          <div className="flex flex-col items-center leading-none">
            <span className="text-[11px] font-medium text-white/90 font-mono tracking-tight">
              {timeStr}
            </span>
            <span className="text-[13px] font-bold text-[#22c55e] tracking-tight mt-0.5 drop-shadow-xs">
              System Monitor
            </span>
          </div>

          {/* Top Right: Interactive Status Button (Click to Toggle Metrics) */}
          <button
            type="button"
            onClick={handleToggleMetrics}
            onDoubleClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            title={showFreeMetrics ? 'Showing Free Capacity (Click for Used)' : 'Showing Usage % (Click for Free)'}
            className="titlebar-no-drag w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-[#22c55e] border border-white/10 shadow-xs cursor-pointer transition-all"
          >
            <Activity className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* MIDDLE GAUGES: TWO CIRCULAR ARC PROGRESS GAUGES (LEFT & RIGHT)    */}
        {/* ================================================================= */}
        <div
          onDoubleClick={(e) => e.stopPropagation()}
          className="titlebar-no-drag flex items-center justify-around flex-1 px-1 my-0.5 z-10 select-text"
        >

          {/* --------------------------------------------------------------- */}
          {/* LEFT GAUGE: CPU LOAD                                            */}
          {/* --------------------------------------------------------------- */}
          <div className="flex flex-col items-center w-[136px]">
            <div className="relative w-[130px] h-[118px] flex items-center justify-center">
              <svg viewBox="0 0 130 120" className="w-full h-full overflow-visible">
                <defs>
                  {/* Yellow -> Emerald -> Neon Lime Arc Gradient */}
                  <linearGradient id="cpuArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#facc15" />
                    <stop offset="35%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#4ade80" />
                  </linearGradient>
                  {/* Subtle Filter for Leading Tip Indicator */}
                  <filter id="tipGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ffffff" floodOpacity="0.8" />
                  </filter>
                </defs>

                {/* Inactive Dark Track Arc */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={R}
                  fill="none"
                  stroke="#122a1b"
                  strokeWidth="11"
                  strokeDasharray={TOTAL_DASH}
                  strokeLinecap="round"
                  transform={`rotate(150 ${CX} ${CY})`}
                />

                {/* Active Colored Progress Arc */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={R}
                  fill="none"
                  stroke="url(#cpuArcGrad)"
                  strokeWidth="11"
                  strokeDasharray={TOTAL_DASH}
                  strokeDashoffset={cpuOffset}
                  strokeLinecap="round"
                  transform={`rotate(150 ${CX} ${CY})`}
                  className="transition-all duration-700 ease-out"
                />

                {/* Leading Edge White Indicator Pill */}
                {cpuClamped > 1 && (
                  <circle
                    cx={cpuTipX}
                    cy={cpuTipY}
                    r="4.2"
                    fill="#ffffff"
                    filter="url(#tipGlow)"
                    className="transition-all duration-700 ease-out"
                  />
                )}
              </svg>

              {/* Inside Arc Center Info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 pointer-events-none select-none">
                <div className="flex items-baseline leading-none">
                  <span className="text-[25px] font-bold text-white tracking-tight">
                    {isLoaded ? (showFreeMetrics ? Math.round(100 - cpuClamped) : cpuPercent) : '...'}
                  </span>
                  <span className="text-[12px] font-semibold text-white/80 ml-0.5">%</span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/90 mt-1">
                  {showFreeMetrics ? 'CPU IDLE' : 'CPU LOAD'}
                </span>
                <span className="text-[10px] font-bold text-white/90 font-mono mt-0.5">
                  {showFreeMetrics ? 'HEADROOM' : (stats?.cpuCores ? `${stats.cpuCores} CORES` : 'APPLE CHIP')}
                </span>
              </div>
            </div>

            {/* Bottom Subtitle for CPU */}
            <span className="text-[10px] text-neutral-400 font-mono truncate max-w-[130px] text-center mt-0.5">
              {stats?.cpuModel || 'Apple Processor'}
            </span>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* RIGHT GAUGE: MEMORY (RAM)                                       */}
          {/* --------------------------------------------------------------- */}
          <div className="flex flex-col items-center w-[136px]">
            <div className="relative w-[130px] h-[118px] flex items-center justify-center">
              <svg viewBox="0 0 130 120" className="w-full h-full overflow-visible">
                <defs>
                  {/* Amber -> Teal -> Emerald Arc Gradient */}
                  <linearGradient id="memArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="40%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>

                {/* Inactive Dark Track Arc */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={R}
                  fill="none"
                  stroke="#122a1b"
                  strokeWidth="11"
                  strokeDasharray={TOTAL_DASH}
                  strokeLinecap="round"
                  transform={`rotate(150 ${CX} ${CY})`}
                />

                {/* Active Colored Progress Arc */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={R}
                  fill="none"
                  stroke="url(#memArcGrad)"
                  strokeWidth="11"
                  strokeDasharray={TOTAL_DASH}
                  strokeDashoffset={memOffset}
                  strokeLinecap="round"
                  transform={`rotate(150 ${CX} ${CY})`}
                  className="transition-all duration-700 ease-out"
                />

                {/* Leading Edge White Indicator Pill */}
                {memClamped > 1 && (
                  <circle
                    cx={memTipX}
                    cy={memTipY}
                    r="4.2"
                    fill="#ffffff"
                    filter="url(#tipGlow)"
                    className="transition-all duration-700 ease-out"
                  />
                )}
              </svg>

              {/* Inside Arc Center Info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 pointer-events-none select-none">
                <div className="flex items-baseline leading-none">
                  <span className="text-[25px] font-bold text-white tracking-tight">
                    {isLoaded ? (showFreeMetrics ? Math.round(100 - memClamped) : memPercent) : '...'}
                  </span>
                  <span className="text-[12px] font-semibold text-white/80 ml-0.5">%</span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/90 mt-1">
                  {showFreeMetrics ? 'FREE RAM' : 'MEMORY RAM'}
                </span>
                <span className="text-[10px] font-bold text-white/90 font-mono mt-0.5">
                  {showFreeMetrics ? `${freeGBStr}GB FREE` : (stats ? `${stats.usedMemGB} GB` : '...')}
                </span>
              </div>
            </div>

            {/* Bottom Subtitle for Memory */}
            <span className="text-[10px] text-neutral-400 font-mono truncate max-w-[130px] text-center mt-0.5">
              Total: {stats ? `${stats.totalMemGB} GB` : '...'}
            </span>
          </div>

        </div>

        {/* ================================================================= */}
        {/* BOTTOM FOOTER: Segmented Activity Strip & Uptime (Image Style)    */}
        {/* ================================================================= */}
        <div className="titlebar-drag-region flex items-center justify-between px-1 pt-1 border-t border-emerald-500/15 text-[10px] text-neutral-400 font-mono z-10 shrink-0">
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5 text-emerald-400" />
            Up: {stats?.uptimeFormatted || '0m'}
          </span>

          {/* Mini Segmented Stripe Indicator (matching bottom of reference image) */}
          <div className="flex items-center gap-[2.5px] px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/20">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className={`w-[2.5px] h-[9px] rounded-full transition-colors ${i < Math.round((cpuPercent / 100) * 14) ? 'bg-[#22c55e]' : 'bg-emerald-900/40'
                  }`}
              />
            ))}
          </div>

          <span className="text-neutral-400">
            Z-Widgets
          </span>
        </div>

      </div>
    </div>
  )
}
