import os from 'os'
import { SystemStats, Platform } from '../../shared/types'

let prevCpus = os.cpus()

function calculateCpuUsage(): number {
  const currentCpus = os.cpus()
  let idleDelta = 0, totalDelta = 0
  for (let i = 0; i < currentCpus.length; i++) {
    const prev = prevCpus[i]?.times || { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 }
    const curr = currentCpus[i].times
    totalDelta += (curr.user + curr.nice + curr.sys + curr.idle + curr.irq) - (prev.user + prev.nice + prev.sys + prev.idle + prev.irq)
    idleDelta += curr.idle - prev.idle
  }
  prevCpus = currentCpus
  if (totalDelta <= 0) return 0
  return Math.max(0, Math.min(100, Math.round(((totalDelta - idleDelta) / totalDelta) * 100)))
}

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function getSystemStats(): SystemStats {
  const cpus = os.cpus(), total = os.totalmem(), free = os.freemem(), used = Math.max(0, total - free)
  const gb = 1024 * 1024 * 1024
  return {
    cpuUsage: calculateCpuUsage(),
    cpuModel: cpus[0]?.model ? cpus[0].model.replace(/\s+/g, ' ').trim() : 'Apple Silicon / x86',
    cpuCores: cpus.length || 1,
    totalMemGB: Math.round((total / gb) * 10) / 10,
    usedMemGB: Math.round((used / gb) * 10) / 10,
    freeMemGB: Math.round((free / gb) * 10) / 10,
    memUsage: total > 0 ? Math.round((used / total) * 100) : 0,
    uptimeFormatted: formatUptime(os.uptime()),
    platform: process.platform as Platform
  }
}
