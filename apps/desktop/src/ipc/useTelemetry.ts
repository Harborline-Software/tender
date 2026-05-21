import { useState, useEffect } from 'react'
import { getServices, getSystemStats, getDevices, ServiceData, StatsData, DeviceData } from './tauri'

export function useServices(intervalMs = 5000): ServiceData[] | null {
  const [data, setData] = useState<ServiceData[] | null>(null)
  useEffect(() => {
    let alive = true
    const poll = () => {
      getServices()
        .then((r) => { if (alive) setData(r) })
        .catch(() => { /* tauri not available in browser dev */ })
    }
    poll()
    const id = setInterval(poll, intervalMs)
    return () => { alive = false; clearInterval(id) }
  }, [intervalMs])
  return data
}

export function useSystemStats(intervalMs = 3000): StatsData | null {
  const [data, setData] = useState<StatsData | null>(null)
  useEffect(() => {
    let alive = true
    const poll = () => {
      getSystemStats()
        .then((r) => { if (alive) setData(r) })
        .catch(() => { })
    }
    poll()
    const id = setInterval(poll, intervalMs)
    return () => { alive = false; clearInterval(id) }
  }, [intervalMs])
  return data
}

export function useDevices(intervalMs = 30000): DeviceData[] | null {
  const [data, setData] = useState<DeviceData[] | null>(null)
  useEffect(() => {
    let alive = true
    const poll = () => {
      getDevices()
        .then((r) => { if (alive) setData(r) })
        .catch(() => { })
    }
    poll()
    const id = setInterval(poll, intervalMs)
    return () => { alive = false; clearInterval(id) }
  }, [intervalMs])
  return data
}
