import { useState, useEffect } from 'react'
import { getServices, getSystemStats, getDevices, getLocalServices, getProjects, ServiceData, StatsData, DeviceData, ProcessData, ProjectData } from './tauri'

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

/** Top processes from this node. Polled at the same cadence as the spec's "Local services list" interval. */
export function useLocalServices(intervalMs = 5000): ProcessData[] | null {
  const [data, setData] = useState<ProcessData[] | null>(null)
  useEffect(() => {
    let alive = true
    const poll = () => {
      getLocalServices()
        .then((r) => { if (alive) setData(r) })
        .catch(() => { /* tauri not available in browser dev */ })
    }
    poll()
    const id = setInterval(poll, intervalMs)
    return () => { alive = false; clearInterval(id) }
  }, [intervalMs])
  return data
}

/** Projects list. Fetched once on mount; the spec cadence is "on user open" (no polling). */
export function useProjects(): ProjectData[] | null {
  const [data, setData] = useState<ProjectData[] | null>(null)
  useEffect(() => {
    let alive = true
    getProjects()
      .then((r) => { if (alive) setData(r) })
      .catch(() => { /* tauri not available in browser dev */ })
    return () => { alive = false }
  }, [])
  return data
}
