/**
 * useInitiative Hook
 * ==================
 * Custom hook for real-time initiative order synchronization with Firebase
 */

import { useState, useEffect, useCallback } from 'react'
import { database, ref, push, remove, onValue, off, set } from '../config/firebase'
import type { InitiativeEntry, InitiativeState } from '../types/initiative'

const USERNAME_KEY = 'dnd_chat_username'

export function useInitiative() {
  const [entries, setEntries] = useState<InitiativeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initiativeState, setInitiativeState] = useState<InitiativeState | null>(null)

  const username = typeof window !== 'undefined' ? localStorage.getItem(USERNAME_KEY) : null

  // Subscribe to initiative entries
  useEffect(() => {
    const entriesRef = ref(database, 'initiative/entries')

    onValue(
      entriesRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          const entryArray: InitiativeEntry[] = Object.entries(data).map(
            ([id, value]: [string, any]) => ({
              id,
              name: value.name || 'Unknown',
              initiative: value.initiative || 0,
              addedBy: value.addedBy || 'Anonymous',
              addedAt: value.addedAt,
            })
          )
          // Sort by initiative (highest first)
          entryArray.sort((a, b) => b.initiative - a.initiative)
          setEntries(entryArray)
        } else {
          setEntries([])
        }
        setLoading(false)
      },
      (err) => {
        console.error('Firebase initiative error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => {
      off(entriesRef)
    }
  }, [])

  // Subscribe to initiative state (current turn)
  useEffect(() => {
    const stateRef = ref(database, 'initiative/state')

    onValue(
      stateRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          setInitiativeState(data as InitiativeState)
        } else {
          setInitiativeState(null)
        }
      },
      (err) => {
        console.error('Firebase initiative state error:', err)
      }
    )

    return () => {
      off(stateRef)
    }
  }, [])

  // Get the current turn entry
  const currentTurnEntry = entries.find(e => e.id === initiativeState?.currentTurnId) || null

  // Add a new initiative entry
  const addEntry = useCallback(async (name: string, initiative: number): Promise<void> => {
    if (!name.trim()) return

    try {
      const entriesRef = ref(database, 'initiative/entries')
      await push(entriesRef, {
        name: name.trim(),
        initiative: initiative,
        addedBy: username || 'Anonymous',
        addedAt: Date.now(),
      })
    } catch (err) {
      console.error('Error adding initiative entry:', err)
      setError(err instanceof Error ? err.message : 'Failed to add entry')
    }
  }, [username])

  // Remove an initiative entry
  const removeEntry = useCallback(async (entryId: string): Promise<void> => {
    try {
      const entryRef = ref(database, `initiative/entries/${entryId}`)
      await remove(entryRef)

      // If this was the current turn, clear it
      if (initiativeState?.currentTurnId === entryId) {
        const stateRef = ref(database, 'initiative/state')
        await remove(stateRef)
      }
    } catch (err) {
      console.error('Error removing initiative entry:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove entry')
    }
  }, [initiativeState])

  // Set the current turn
  const setCurrentTurn = useCallback(async (entryId: string | null): Promise<void> => {
    try {
      const stateRef = ref(database, 'initiative/state')
      if (entryId) {
        await set(stateRef, {
          currentTurnId: entryId,
          updatedAt: Date.now(),
        })
      } else {
        await remove(stateRef)
      }
    } catch (err) {
      console.error('Error setting current turn:', err)
      setError(err instanceof Error ? err.message : 'Failed to set turn')
    }
  }, [])

  // Move to next turn
  const nextTurn = useCallback(async (): Promise<InitiativeEntry | null> => {
    if (entries.length === 0) return null

    let nextEntry: InitiativeEntry

    if (!initiativeState?.currentTurnId) {
      // No current turn, start with highest initiative
      nextEntry = entries[0]
    } else {
      // Find current index and move to next
      const currentIndex = entries.findIndex(e => e.id === initiativeState.currentTurnId)
      if (currentIndex === -1 || currentIndex >= entries.length - 1) {
        // Current not found or at end, wrap to beginning
        nextEntry = entries[0]
      } else {
        nextEntry = entries[currentIndex + 1]
      }
    }

    await setCurrentTurn(nextEntry.id)
    return nextEntry
  }, [entries, initiativeState, setCurrentTurn])

  // Clear all initiative entries
  const clearInitiative = useCallback(async (): Promise<void> => {
    try {
      const initiativeRef = ref(database, 'initiative')
      await remove(initiativeRef)
    } catch (err) {
      console.error('Error clearing initiative:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear initiative')
    }
  }, [])

  return {
    entries,
    loading,
    error,
    currentTurnEntry,
    initiativeState,
    addEntry,
    removeEntry,
    setCurrentTurn,
    nextTurn,
    clearInitiative,
  }
}
