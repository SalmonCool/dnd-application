/**
 * useVolume Hook
 * ==============
 * Manages volume levels for different audio sources
 * Persists to localStorage for user preference retention
 */

import { useState, useEffect, useCallback } from 'react'

export interface VolumeSettings {
  master: number
  stream: number
  music: number
  dice: number
  spells: number
  artifacts: number
  soundboard: number
  daggers: number
}

const STORAGE_KEY = 'dnd_volume_settings'

const DEFAULT_SETTINGS: VolumeSettings = {
  master: 100,
  stream: 100,
  music: 100,
  dice: 100,
  spells: 100,
  artifacts: 100,
  soundboard: 100,
  daggers: 100,
}

export function useVolume() {
  const [volumes, setVolumes] = useState<VolumeSettings>(() => {
    // Load from localStorage on init
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
      } catch {
        return DEFAULT_SETTINGS
      }
    }
    return DEFAULT_SETTINGS
  })

  // Save to localStorage whenever volumes change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes))
  }, [volumes])

  // Calculate effective volume (sub-volume * master / 100)
  const getEffectiveVolume = useCallback((type: keyof Omit<VolumeSettings, 'master'>) => {
    return (volumes[type] * volumes.master) / 100 / 100 // Returns 0-1 range
  }, [volumes])

  // Expose effective volumes on window for other components to use
  useEffect(() => {
    window.__getVolume = (type: string) => {
      if (type === 'master') return volumes.master / 100
      return getEffectiveVolume(type as keyof Omit<VolumeSettings, 'master'>)
    }

    return () => {
      delete window.__getVolume
    }
  }, [volumes, getEffectiveVolume])

  const setVolume = useCallback((type: keyof VolumeSettings, value: number) => {
    setVolumes(prev => ({
      ...prev,
      [type]: Math.max(0, Math.min(100, value)),
    }))
  }, [])

  return {
    volumes,
    setVolume,
    getEffectiveVolume,
  }
}
