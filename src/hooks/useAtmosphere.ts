/**
 * useAtmosphere Hook
 * ==================
 * Syncs atmosphere setting across all users via Firebase Realtime Database.
 * When one user changes the atmosphere, all connected users see the change.
 */

import { useState, useEffect, useCallback } from 'react'
import { database, ref, set, onValue, off } from '../config/firebase'

export type AtmosphereType = 'none' | 'winter' | 'ember'

export function useAtmosphere() {
  const [atmosphere, setAtmosphereLocal] = useState<AtmosphereType>('none')

  // Subscribe to atmosphere changes from Firebase
  useEffect(() => {
    const atmosphereRef = ref(database, 'atmosphere')

    onValue(
      atmosphereRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data && (data === 'none' || data === 'winter' || data === 'ember')) {
          setAtmosphereLocal(data)
        } else {
          setAtmosphereLocal('none')
        }
      },
      (err) => {
        console.error('Firebase atmosphere error:', err)
      }
    )

    return () => {
      off(atmosphereRef)
    }
  }, [])

  // Set atmosphere in Firebase (syncs to all users)
  const setAtmosphere = useCallback(async (value: AtmosphereType) => {
    try {
      const atmosphereRef = ref(database, 'atmosphere')
      await set(atmosphereRef, value)
    } catch (err) {
      console.error('Error setting atmosphere:', err)
    }
  }, [])

  return { atmosphere, setAtmosphere }
}
