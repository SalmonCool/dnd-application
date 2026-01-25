/**
 * useSpellbook Hook
 * =================
 * Custom hook for real-time spellbook synchronization with Firebase
 */

import { useState, useEffect, useCallback } from 'react'
import { database, ref, push, remove, onValue, off, set } from '../config/firebase'
import type { Spell, DiceType, SpellCastEvent } from '../types/spell'

// Dice max values
const DICE_MAX: Record<DiceType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
}

export function useSpellbook() {
  const [spells, setSpells] = useState<Spell[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [spellCastEvent, setSpellCastEvent] = useState<SpellCastEvent | null>(null)

  useEffect(() => {
    const spellsRef = ref(database, 'spellbook/spells')

    // Subscribe to real-time updates
    onValue(
      spellsRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          // Convert object to array and sort by name
          const spellArray: Spell[] = Object.entries(data).map(
            ([id, value]: [string, any]) => ({
              id,
              name: value.name,
              diceType: value.diceType,
              diceCount: value.diceCount,
              description: value.description,
              soundUrl: value.soundUrl,
              createdBy: value.createdBy || 'Anonymous',
              createdAt: value.createdAt,
            })
          )
          // Sort spells alphabetically by name
          spellArray.sort((a, b) => a.name.localeCompare(b.name))
          setSpells(spellArray)
        } else {
          setSpells([])
        }
        setLoading(false)
      },
      (err) => {
        console.error('Firebase spellbook error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    // Cleanup: unsubscribe when component unmounts
    return () => {
      off(spellsRef)
    }
  }, [])

  // Listen for spell cast events (for playing sounds)
  useEffect(() => {
    const castRef = ref(database, 'spellbook/currentCast')

    onValue(castRef, (snapshot) => {
      const data = snapshot.val()
      if (data && data.soundUrl) {
        // Only trigger if this is a recent cast (within last 5 seconds)
        if (Date.now() - data.timestamp < 5000) {
          setSpellCastEvent(data as SpellCastEvent)
        }
      }
    })

    return () => {
      off(castRef)
    }
  }, [])

  const addSpell = async (
    name: string,
    diceType: DiceType,
    diceCount: number,
    description: string,
    createdBy: string,
    soundUrl?: string
  ): Promise<void> => {
    if (!name.trim()) return

    try {
      const spellsRef = ref(database, 'spellbook/spells')
      await push(spellsRef, {
        name: name.trim(),
        diceType,
        diceCount,
        description: description.trim() || null,
        soundUrl: soundUrl?.trim() || null,
        createdBy: createdBy.trim() || 'Anonymous',
        createdAt: Date.now(),
      })
    } catch (err) {
      console.error('Error adding spell:', err)
      setError(err instanceof Error ? err.message : 'Failed to add spell')
    }
  }

  // Broadcast a spell cast event to all clients (for sound playback)
  const broadcastSpellCast = useCallback(async (
    spell: Spell,
    castBy: string
  ): Promise<void> => {
    if (!spell.soundUrl) return

    try {
      const castRef = ref(database, 'spellbook/currentCast')
      await set(castRef, {
        id: spell.id,
        spellName: spell.name,
        soundUrl: spell.soundUrl,
        castBy,
        timestamp: Date.now(),
      })
    } catch (err) {
      console.error('Error broadcasting spell cast:', err)
    }
  }, [])

  // Clear the spell cast event after it's been handled
  const clearSpellCastEvent = useCallback(() => {
    setSpellCastEvent(null)
  }, [])

  const removeSpell = async (spellId: string): Promise<void> => {
    try {
      const spellRef = ref(database, `spellbook/spells/${spellId}`)
      await remove(spellRef)
    } catch (err) {
      console.error('Error removing spell:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove spell')
    }
  }

  // Roll dice for a spell and return results
  const castSpell = (spell: Spell): { rolls: number[]; total: number } => {
    const maxValue = DICE_MAX[spell.diceType]
    const rolls: number[] = []

    for (let i = 0; i < spell.diceCount; i++) {
      rolls.push(Math.floor(Math.random() * maxValue) + 1)
    }

    const total = rolls.reduce((sum, roll) => sum + roll, 0)
    return { rolls, total }
  }

  return {
    spells,
    loading,
    error,
    spellCastEvent,
    addSpell,
    removeSpell,
    castSpell,
    broadcastSpellCast,
    clearSpellCastEvent,
  }
}
