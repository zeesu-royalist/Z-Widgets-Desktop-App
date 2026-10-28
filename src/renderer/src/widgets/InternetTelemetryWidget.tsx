import React, { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'

interface InternetTelemetryWidgetProps {
  widgetId: string
  onClose?: () => Promise<void>
}

/* ---------- Tick-arc dial (accurately matching the reference image) ---------- */
const TICK_COUNT = 29
const ACCENT_INDEX = 21 // vibrant pink tick (matching "FIRST LIGHT" / "INTERNET")

interface CelestialArcDialProps {
  progress: number
}

const CelestialArcDial: React.FC<CelestialArcDialProps> = ({ progress }) => {
  const cx = 160
  const cy = -20
  const rOuter = 118
  const rInner = 99
  const alphaMax = (54 * Math.PI) / 180 // ±54 degrees from bottom vertical

  const activeTickIndex = Math.min(TICK_COUNT - 1, Math.max(0, Math.round(progress * (TICK_COUNT - 1))))

  const ticks = useMemo(() => {
    return Array.from({ length: TICK_COUNT }, (_, i) => {
      const t = i / (TICK_COUNT - 1)
      const alpha = -alphaMax + 2 * alphaMax * t
      const sinA = Math.sin(alpha)
      const cosA = Math.cos(alpha)

      const isMarker = i === activeTickIndex
      const isAccent = i === ACCENT_INDEX

      let color = '#9b76c8'
      let strokeWidth = 3.8
      let opacity = 0.92
      let blur = 0

      if (isMarker) {
        color = '#ffffff'
        strokeWidth = 4.5
        opacity = 1
      } else if (isAccent) {
        color = '#d482ec'
        strokeWidth = 4.0
        opacity = 1
      } else {
        // Faded / blurred tips at both ends
        if (i === 0 || i === TICK_COUNT - 1) {
          opacity = 0.2
          blur = 2.5
        } else if (i === 1 || i === TICK_COUNT - 2) {
          opacity = 0.4
          blur = 1.5
        } else if (i === 2 || i === TICK_COUNT - 3) {
          opacity = 0.65
          blur = 0.8
        } else if (i === 3 || i === TICK_COUNT - 4) {
          opacity = 0.8
        }
      }

      return {
        i,
        x1: cx + rInner * sinA,
        y1: cy + rInner * cosA,
        x2: cx + rOuter * sinA,
        y2: cy + rOuter * cosA,
        color,
        strokeWidth,
        opacity,
        blur
      }
    })
  }, [activeTickIndex, alphaMax, cx, cy, rInner, rOuter])

  // Compute moving pointer (triangle + circle indicator) at current progress
  const markerAlpha = -alphaMax + 2 * alphaMax * progress
  const sinM = Math.sin(markerAlpha)
  const cosM = Math.cos(markerAlpha)

  const rApex = 92
  const apexX = cx + rApex * sinM
  const apexY = cy + rApex * cosM

  const rBase = 81
  const baseX = cx + rBase * sinM
  const baseY = cy + rBase * cosM

  const perpX = cosM * 5.5
  const perpY = -sinM * 5.5

  const b1X = baseX - perpX
  const b1Y = baseY - perpY
  const b2X = baseX + perpX
  const b2Y = baseY + perpY

  const trianglePoints = `${b1X.toFixed(2)},${b1Y.toFixed(2)} ${b2X.toFixed(2)},${b2Y.toFixed(2)} ${apexX.toFixed(2)},${apexY.toFixed(2)}`

  return (
    <svg
      viewBox="0 0 320 108"
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-[76px] max-h-[82px] overflow-visible pointer-events-none"
    >
      <defs>
        <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <filter id="beadGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Render all arc ticks */}
      {ticks.map((t) => (
        <line
          key={t.i}
          x1={t.x1.toFixed(2)}
          y1={t.y1.toFixed(2)}
          x2={t.x2.toFixed(2)}
          y2={t.y2.toFixed(2)}
          stroke={t.color}
          strokeWidth={t.strokeWidth}
          strokeLinecap="round"
          strokeOpacity={t.opacity}
          style={t.blur > 0 ? { filter: `blur(${t.blur}px)` } : undefined}
        />
      ))}

      {/* White indicator triangle pointing down along the arc into the active tick */}
      <polygon points={trianglePoints} fill="#ffffff" />

      {/* Moving circular glowing bead at the pointer tip */}
      <circle cx={apexX.toFixed(2)} cy={apexY.toFixed(2)} r="4.5" fill="#ffffff" opacity="0.35" filter="url(#beadGlow)" />
      <circle cx={apexX.toFixed(2)} cy={apexY.toFixed(2)} r="2.2" fill="#ffffff" />
    </svg>
  )
}

export const InternetTelemetryWidget: React.FC<InternetTelemetryWidgetProps> = ({ widgetId, onClose }) => {
  // Smooth sinusoidal motion of the arc marker
  const [progress, setProgress] = useState(0.25)

  // Rock-solid fixed 2-digit numbers that NEVER cause layout jumps
  const [dummyStats, setDummyStats] = useState({
    val1: 10,
    val2: 23
  })

  // Live telemetry: 5 animated spectrum bars, ping & transfer rates (zero-jump fixed lengths)
  const [spectrum, setSpectrum] = useState([35, 75, 95, 60, 80])
  const [netStats, setNetStats] = useState({
    up: '2.4',
    down: '18',
    ping: 21
  })

  useEffect(() => {
    let animId: number
    const startTime = performance.now()

    const animate = (now: number): void => {
      const elapsed = (now - startTime) / 1000
      // Smooth sinusoidal sweep between 0.18 and 0.82
      const p = 0.5 + 0.32 * Math.sin(elapsed * 1.1)
      setProgress(p)
      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [])

  // Header stats update: always 2-digit numbers (10-29 and 10-98)
  useEffect(() => {
    const timer = setInterval(() => {
      const v1 = Math.floor(Math.random() * 20) + 10
      const v2 = Math.floor(Math.random() * 89) + 10
      setDummyStats({ val1: v1, val2: v2 })
    }, 2500)

    return () => clearInterval(timer)
  }, [])

  // Stream timer: constant string-length metrics to completely prevent layout jumping
  useEffect(() => {
    const streamTimer = setInterval(() => {
      setSpectrum([
        Math.floor(Math.random() * 55) + 35,
        Math.floor(Math.random() * 70) + 25,
        Math.floor(Math.random() * 85) + 15,
        Math.floor(Math.random() * 70) + 25,
        Math.floor(Math.random() * 55) + 35
      ])
      setNetStats({
        up: (Math.random() * 3 + 1.2).toFixed(1), // always 3 characters: "X.X"
        down: String(Math.floor(Math.random() * 15) + 12), // always 2 digits: "XX"
        ping: Math.floor(Math.random() * 14) + 16 // always 2 digits: "XX"
      })
    }, 500)

    return () => clearInterval(streamTimer)
  }, [])

  const handleClose = async (): Promise<void> => {
    if (onClose) return onClose()
    try {
      if (window.api?.closeSelf) await window.api.closeSelf()
      else if (window.api?.closeWidget) await window.api.closeWidget(widgetId)
    } catch {
      window.api?.closeWidget?.(widgetId).catch(() => {})
    }
  }

  return (
    <div className="w-screen h-screen p-2 flex items-center justify-center bg-transparent select-none overflow-hidden font-sans">
      <div
        onDoubleClick={handleClose}
        className="titlebar-drag-region group relative w-full h-full rounded-[24px] overflow-hidden cursor-move flex flex-col justify-between px-5 pt-4 pb-3.5 select-none"
        style={{
          background: 'linear-gradient(180deg, #100b42 0%, #1a104c 25%, #351a66 60%, #582684 90%, #602888 100%)'
        }}
        title="Double-click to close"
      >
        {/* Top Row: Clean zero-jump header */}
        <div className="relative z-10 flex items-baseline justify-between w-full">
          {/* Fixed-width number slots so text NEVER shifts */}
          <div className="flex items-baseline tracking-tight font-sans">
            <span className="w-[34px] text-right font-bold text-[26px] text-white tabular-nums leading-none">
              {dummyStats.val1}
            </span>
            <span className="text-[14px] font-bold text-[#8071ad] uppercase ml-1 mr-2.5 leading-none">
              MB
            </span>
            <span className="w-[34px] text-right font-bold text-[26px] text-white tabular-nums leading-none">
              {dummyStats.val2}
            </span>
            <span className="text-[14px] font-bold text-[#8071ad] uppercase ml-1 leading-none">
              KB
            </span>
          </div>

          {/* Right label: INTERNET with subtle close button on hover */}
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold uppercase tracking-wider text-[#d482ec] leading-none">
              INTERNET
            </span>
            <button
              onClick={handleClose}
              aria-label="Close widget"
              title="Close widget"
              className="titlebar-no-drag opacity-0 group-hover:opacity-100 p-1 -mr-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Center: The U-shaped tick arc dial properly sized */}
        <div className="relative z-0 flex-1 flex items-center justify-center overflow-visible my-auto">
          <CelestialArcDial progress={progress} />
        </div>

        {/* Bottom Row: 12kb on left, compact telemetry pill in center, 20mb on right */}
        <div className="relative z-10 flex items-center justify-between w-full px-1">
          {/* Left: 12kb */}
          <span className="w-11 text-left text-[13px] font-bold text-[#9d6bb1] font-mono tabular-nums leading-none select-none">
            12kb
          </span>

          {/* Center: Sleek Live Telemetry Pill with spectrum & activity (perfect fit & no jumping) */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
            {/* 5 Animated spectrum bars */}
            <div className="flex items-end gap-[2px] h-3">
              {spectrum.map((h, idx) => (
                <span
                  key={idx}
                  className="w-[2px] rounded-full transition-all duration-300"
                  style={{
                    height: `${h}%`,
                    background:
                      idx === 2
                        ? '#d482ec'
                        : idx % 2 === 0
                        ? '#a875db'
                        : '#785498'
                  }}
                />
              ))}
            </div>

            {/* Live ping */}
            <div className="flex items-center gap-1 border-l border-white/10 pl-1.5">
              <span className="text-[10px] font-mono font-semibold text-[#cfb0f5] tabular-nums leading-none">
                {netStats.ping}ms
              </span>
            </div>

            {/* Transfer rates with fixed-width slots */}
            <div className="flex items-center gap-1 border-l border-white/10 pl-1.5 text-[9px] font-mono leading-none">
              <span className="text-[#d482ec]">▲</span>
              <span className="w-[18px] text-right inline-block text-[#c4a0ec] tabular-nums">
                {netStats.up}
              </span>
              <span className="text-[#d482ec] ml-0.5">▼</span>
              <span className="w-[14px] text-right inline-block text-[#c4a0ec] tabular-nums">
                {netStats.down}
              </span>
            </div>
          </div>

          {/* Right: 20mb */}
          <span className="w-11 text-right text-[13px] font-bold text-[#9d6bb1] font-mono tabular-nums leading-none select-none">
            20mb
          </span>
        </div>
      </div>
    </div>
  )
}

