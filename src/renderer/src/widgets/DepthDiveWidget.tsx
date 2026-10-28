import React, { useEffect, useState } from 'react'
import { ArrowUp, ArrowDown, Download, FileText, Folder, Layers, HardDrive, X } from 'lucide-react'

const FILES = [
  { folder: 'Downloads', name: 'setup_installer.dmg', act: 'Downloading package', st: 'Downloading', pct: 78, sz: '142 / 180 MB', spd: '12.4 MB/s', down: true },
  { folder: 'Documents', name: 'annual_report_2026.pdf', act: 'Syncing with iCloud', st: 'Syncing', pct: 92, sz: '18.4 MB', spd: 'iCloud Sync' },
  { folder: 'Documents', name: 'presentation_deck.key', act: 'Auto-saving draft', st: 'Auto-saving', pct: 65, sz: '42.1 MB', spd: 'Local Cache' },
  { folder: 'Downloads', name: 'archive_bundle.zip', act: 'Extracting archive', st: 'Extracting', pct: 45, sz: '310 / 680 MB', spd: '8.2 MB/s', down: true },
  { folder: 'Documents', name: 'contract_notes.docx', act: 'Indexing content', st: 'Indexing', pct: 88, sz: '6.2 MB', spd: 'Search Index' },
  { folder: 'Downloads', name: 'firmware_update.bin', act: 'Verifying hash', st: 'Verifying', pct: 54, sz: '89 / 120 MB', spd: 'SHA-256' },
  { folder: 'Media', name: 'project_render.mp4', act: 'Encoding video stream', st: 'Optimizing', pct: 82, sz: '520 / 640 MB', spd: 'ProRes 422' },
  { folder: 'Desktop', name: 'design_tokens.json', act: 'Validating schema', st: 'Syncing', pct: 100, sz: '1.2 MB', spd: 'Completed' }
]

const ICONS = { Downloads: Download, Documents: FileText, Media: Layers, Desktop: HardDrive }

export const DepthDiveWidget: React.FC<{ widgetId: string; onClose?: () => Promise<void> }> = ({ widgetId, onClose }) => {
  const [idx, setIdx] = useState(0)
  const [textFade, setTextFade] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  // Smooth file transition without layout jumping or container flickering
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setTextFade(false)
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % FILES.length)
        setTextFade(true)
      }, 150)
    }, 3600)
    return () => clearInterval(timer)
  }, [isPaused])

  const cur = FILES[idx]
  const Icon = ICONS[cur.folder as keyof typeof ICONS] || HardDrive

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
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="w-screen h-screen p-2 flex items-center justify-center bg-transparent select-none overflow-hidden font-sans"
    >
      <div
        onDoubleClick={handleClose}
        className="titlebar-drag-region group relative w-full h-full rounded-[28px] overflow-hidden cursor-move flex flex-col justify-between p-4 select-none box-border"
        style={{ background: 'linear-gradient(180deg, #4b4205 0%, #3e3604 50%, #302a03 100%)' }}
        title="Double-click to close (Click ladder ticks to switch files)"
      >
        {/* Top Header: Fixed height 32px - strictly zero vertical/horizontal jumping */}
        <div className="relative z-10 flex items-center justify-between w-full h-8 px-1">
          {/* Left: Folder Name */}
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <Folder className="h-5 w-5 text-white/90 shrink-0" />
            <span
              className={`font-bold text-[22px] text-white leading-none tracking-tight truncate drop-shadow-xs transition-opacity duration-150 ${
                textFade ? 'opacity-100' : 'opacity-40'
              }`}
            >
              {cur.folder}
            </span>
          </div>

          {/* Right: Fixed-width 104px Status Badge + Close Button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-[104px] h-7 flex items-center justify-center gap-1.5 rounded-full bg-black/30 border border-white/10 backdrop-blur-xs shrink-0">
              <span
                className={`font-semibold text-[12px] text-white/95 leading-none tracking-tight font-sans truncate transition-opacity duration-150 ${
                  textFade ? 'opacity-100' : 'opacity-40'
                }`}
              >
                {cur.st}
              </span>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close widget"
              className="titlebar-no-drag opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Main Body: Fixed height 82px - completely isolated layout geometry */}
        <div className="relative z-10 flex items-center gap-2.5 w-full h-[82px]">
          {/* Left: 8-Slot Ladder with Fixed Ticks and Smooth Gliding Needle */}
          <div className="w-7 h-full flex flex-col justify-between py-1 relative shrink-0">
            {FILES.map((f, i) => (
              <button
                key={i}
                onClick={() => { setIdx(i); setTextFade(true) }}
                className="titlebar-no-drag w-full h-1.5 flex items-center p-0 border-0 bg-transparent cursor-pointer group/tick relative"
                title={`${f.folder}: ${f.name} (${f.st})`}
              >
                {/* Fixed-width tick line: never shrinks or expands */}
                <span
                  className={`h-[2px] w-4 rounded-full ml-2.5 transition-colors duration-200 ${
                    i === idx ? 'bg-white' : 'bg-[#756a28]/70 group-hover/tick:bg-white/60'
                  }`}
                />
              </button>
            ))}

            {/* Smooth gliding white arrow pointer */}
            <div
              className="absolute left-0 pointer-events-none transition-transform duration-300 ease-out flex items-center h-1.5"
              style={{ top: '4px', transform: `translateY(${idx * 10}px)` }}
            >
              <svg width="8" height="9" viewBox="0 0 8 9" className="-ml-0.5">
                <polygon points="0,0.5 7,4.5 0,8.5" fill="#ffffff" />
              </svg>
            </div>
          </div>

          {/* Center Card: Fixed 82px height with fixed row heights */}
          <div
            className="flex-1 h-full rounded-[18px] px-3.5 py-2.5 flex flex-col justify-between shadow-inner overflow-hidden"
            style={{ background: '#241f02' }}
          >
            {/* Row 1: Fixed 20px - Arrow + Yellow File Name */}
            <div className="h-5 flex items-center gap-1.5 min-w-0">
              {cur.down ? (
                <ArrowDown className="h-3.5 w-3.5 text-white shrink-0 stroke-[3]" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5 text-white shrink-0 stroke-[3]" />
              )}
              <span
                className={`font-bold text-[15px] text-[#edd75e] truncate tracking-tight font-sans leading-none transition-opacity duration-150 ${
                  textFade ? 'opacity-100' : 'opacity-40'
                }`}
              >
                {cur.name}
              </span>
            </div>

            {/* Row 2: Fixed 16px - Action Detail & Speed */}
            <div className="h-4 flex items-center justify-between text-[11px] font-medium text-[#b8ad82] leading-none">
              <span
                className={`truncate transition-opacity duration-150 ${
                  textFade ? 'opacity-100' : 'opacity-40'
                }`}
              >
                {cur.act}
              </span>
              <span className="font-mono text-[10px] text-white/50 ml-1.5 shrink-0 tabular-nums">
                {cur.spd}
              </span>
            </div>

            {/* Row 3: Fixed 18px - Progress Track & Stats */}
            <div className="h-[18px] flex flex-col justify-between">
              <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${cur.pct}%`,
                    background: 'linear-gradient(90deg, #edd75e 0%, #ffffff 100%)'
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-[#b8ad82]/80 leading-none tabular-nums">
                <span>{cur.sz}</span>
                <span className="font-mono font-medium text-white/70">{cur.pct}%</span>
              </div>
            </div>
          </div>

          {/* Right Card: Fixed 76px width, 82px height - Progress Arc Ring + Icon */}
          <div
            className="w-[76px] h-full rounded-[18px] flex items-center justify-center shadow-inner relative shrink-0"
            style={{ background: '#241f02' }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" className="absolute inset-0 m-auto">
              <circle
                cx="24" cy="24" r="18" fill="none"
                stroke="#3a3203" strokeWidth="3.8"
                strokeDasharray="83 30" strokeLinecap="round"
                transform="rotate(55 24 24)"
              />
              <circle
                cx="24" cy="24" r="18" fill="none"
                stroke="#edd75e" strokeWidth="3.8"
                strokeDasharray={`${Math.max(10, Math.round((cur.pct / 100) * 83))} 100`}
                strokeLinecap="round"
                transform="rotate(55 24 24)"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <Icon
              className={`h-4 w-4 text-white relative z-10 transition-opacity duration-150 ${
                textFade ? 'opacity-100' : 'opacity-40'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
