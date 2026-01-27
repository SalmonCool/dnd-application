/**
 * useSoundboard Hook
 * ==================
 * Manages soundboard with Firebase real-time sync
 * Sounds are shared globally, hotkeys are per-user
 */

import { useState, useEffect, useCallback } from 'react'
import { database, ref, push, set, remove, onValue, update } from '../config/firebase'
import type { SoundEffect, SoundPlayEvent } from '../types/soundboard'

const USERNAME_KEY = 'dnd_chat_username'

export function useSoundboard() {
  const [sounds, setSounds] = useState<SoundEffect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const username = typeof window !== 'undefined' ? localStorage.getItem(USERNAME_KEY) : null

  // Subscribe to sounds list
  useEffect(() => {
    const soundsRef = ref(database, 'soundboard/sounds')

    const unsubscribe = onValue(
      soundsRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          const soundList: SoundEffect[] = Object.entries(data).map(([id, sound]) => ({
            id,
            ...(sound as Omit<SoundEffect, 'id'>),
          }))
          // Sort by addedAt descending
          soundList.sort((a, b) => b.addedAt - a.addedAt)
          setSounds(soundList)
        } else {
          setSounds([])
        }
        setLoading(false)
      },
      (err) => {
        console.error('Error loading sounds:', err)
        setError('Failed to load sounds')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // Add a new sound
  const addSound = useCallback(async (title: string, url: string): Promise<string | null> => {
    if (!username) return null

    try {
      const soundsRef = ref(database, 'soundboard/sounds')
      const newSoundRef = push(soundsRef)

      await set(newSoundRef, {
        title: title.trim() || 'Untitled Sound',
        url: url.trim(),
        hotkey: null,
        addedBy: username,
        addedAt: Date.now(),
      })

      return newSoundRef.key
    } catch (err) {
      console.error('Error adding sound:', err)
      throw err
    }
  }, [username])

  // Remove a sound
  const removeSound = useCallback(async (soundId: string) => {
    try {
      const soundRef = ref(database, `soundboard/sounds/${soundId}`)
      await remove(soundRef)
    } catch (err) {
      console.error('Error removing sound:', err)
      throw err
    }
  }, [])

  // Set hotkey for a sound
  const setHotkey = useCallback(async (soundId: string, hotkey: string | null) => {
    try {
      // If setting a hotkey, first check if it's already used
      if (hotkey) {
        const existingSound = sounds.find(s => s.hotkey === hotkey && s.id !== soundId)
        if (existingSound) {
          throw new Error(`Hotkey Ctrl+${hotkey} is already bound to "${existingSound.title}"`)
        }
      }

      const soundRef = ref(database, `soundboard/sounds/${soundId}`)
      await update(soundRef, { hotkey })
    } catch (err) {
      console.error('Error setting hotkey:', err)
      throw err
    }
  }, [sounds])

  // Play a sound (broadcasts to all users)
  const playSound = useCallback(async (sound: SoundEffect) => {
    if (!username) return

    try {
      const playEventRef = ref(database, 'soundboard/currentPlay')
      await set(playEventRef, {
        soundId: sound.id,
        url: sound.url,
        title: sound.title,
        playedBy: username,
        playedAt: Date.now(),
      })
    } catch (err) {
      console.error('Error playing sound:', err)
      throw err
    }
  }, [username])

  // Get sound by hotkey
  const getSoundByHotkey = useCallback((hotkey: string): SoundEffect | undefined => {
    return sounds.find(s => s.hotkey?.toUpperCase() === hotkey.toUpperCase())
  }, [sounds])

  return {
    sounds,
    loading,
    error,
    addSound,
    removeSound,
    setHotkey,
    playSound,
    getSoundByHotkey,
  }
}

// Hook to listen for sound play events
export function useSoundPlayListener(onPlay: (event: SoundPlayEvent) => void) {
  useEffect(() => {
    const playRef = ref(database, 'soundboard/currentPlay')
    let lastPlayedAt = 0

    const unsubscribe = onValue(playRef, (snapshot) => {
      const data = snapshot.val() as SoundPlayEvent | null
      if (data && data.playedAt > lastPlayedAt) {
        lastPlayedAt = data.playedAt
        onPlay(data)
      }
    })

    return () => unsubscribe()
  }, [onPlay])
}
