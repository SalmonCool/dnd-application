/**
 * useSceneDaggers Hook
 * ====================
 * Custom hook for real-time 3D scene dagger synchronization with Firebase
 * Daggers are shared and visible to all users in the 3D scene
 */

import { useState, useEffect } from 'react'
import { database, ref, push, remove, onValue, off } from '../config/firebase'
import type { Dagger3D, DaggerInput } from '../types/dagger'

export function useSceneDaggers() {
  const [daggers, setDaggers] = useState<Dagger3D[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to daggers
  useEffect(() => {
    const daggersRef = ref(database, 'sceneDaggers')

    onValue(
      daggersRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          const daggerArray: Dagger3D[] = Object.entries(data).map(
            ([id, value]: [string, any]) => ({
              id,
              position: value.position,
              createdBy: value.createdBy || 'Anonymous',
              createdAt: value.createdAt,
            })
          )
          daggerArray.sort((a, b) => a.createdAt - b.createdAt)
          setDaggers(daggerArray)
        } else {
          setDaggers([])
        }
        setLoading(false)
      },
      (err) => {
        console.error('Firebase scene daggers error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => {
      off(daggersRef)
    }
  }, [])

  const addDagger = async (input: DaggerInput, username: string): Promise<void> => {
    try {
      // Remove any existing dagger by this user (one dagger per user)
      const existingDagger = daggers.find((d) => d.createdBy === username)
      if (existingDagger) {
        const existingRef = ref(database, `sceneDaggers/${existingDagger.id}`)
        await remove(existingRef)
      }

      // Add the new dagger
      const daggersRef = ref(database, 'sceneDaggers')
      await push(daggersRef, {
        position: input.position,
        createdBy: username,
        createdAt: Date.now(),
      })

      // Play stab sound
      playStabSound()
    } catch (err) {
      console.error('Error adding scene dagger:', err)
      setError(err instanceof Error ? err.message : 'Failed to add dagger')
    }
  }

  const removeDagger = async (daggerId: string): Promise<void> => {
    try {
      const daggerRef = ref(database, `sceneDaggers/${daggerId}`)
      await remove(daggerRef)
    } catch (err) {
      console.error('Error removing scene dagger:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove dagger')
    }
  }

  const clearAllDaggers = async (): Promise<void> => {
    try {
      const daggersRef = ref(database, 'sceneDaggers')
      await remove(daggersRef)
      console.log('All scene daggers cleared')
    } catch (err) {
      console.error('Error clearing scene daggers:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear daggers')
    }
  }

  return {
    daggers,
    loading,
    error,
    addDagger,
    removeDagger,
    clearAllDaggers,
  }
}

/**
 * Play the dagger stab sound effect
 * Sound file should be placed at: public/sounds/dagger-stab.mp3
 */
function playStabSound() {
  try {
    // Get volume from global volume control
    let volume = 0.5
    if (typeof window !== 'undefined' && (window as any).__getVolume) {
      const fetchedVolume = (window as any).__getVolume('daggers')
      // Ensure volume is a valid finite number between 0 and 1
      if (typeof fetchedVolume === 'number' && Number.isFinite(fetchedVolume)) {
        volume = Math.max(0, Math.min(1, fetchedVolume))
      }
    }

    const audio = new Audio('/sounds/dagger/KnifeThrownAtTable.mp3')
    audio.volume = volume
    audio.play().catch((err) => {
      console.warn('Could not play dagger stab sound:', err)
    })
  } catch (err) {
    console.warn('Error playing dagger stab sound:', err)
  }
}
