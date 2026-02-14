/**
 * useCharacter Hook
 * =================
 * Custom hook for per-user character sheet synchronization with Firebase
 */

import { useState, useEffect, useCallback } from 'react'
import { database, ref, onValue, off, set } from '../config/firebase'
import type { CharacterStats, SkillProficiencies, SkillProficiency } from '../types/character'
import { DEFAULT_SKILL_PROFICIENCIES } from '../types/character'

const USERNAME_KEY = 'dnd_chat_username'

const DEFAULT_STATS: CharacterStats = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  level: 1,
  skillProficiencies: { ...DEFAULT_SKILL_PROFICIENCIES },
}

export function useCharacter() {
  const [stats, setStats] = useState<CharacterStats>(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const username = typeof window !== 'undefined' ? localStorage.getItem(USERNAME_KEY) : null

  // Subscribe to character stats
  useEffect(() => {
    if (!username) {
      setLoading(false)
      return
    }

    const statsRef = ref(database, `characters/${username}/stats`)

    onValue(
      statsRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          setStats({
            strength: data.strength ?? 10,
            dexterity: data.dexterity ?? 10,
            constitution: data.constitution ?? 10,
            intelligence: data.intelligence ?? 10,
            wisdom: data.wisdom ?? 10,
            charisma: data.charisma ?? 10,
            level: data.level ?? 1,
            skillProficiencies: data.skillProficiencies
              ? { ...DEFAULT_SKILL_PROFICIENCIES, ...data.skillProficiencies }
              : { ...DEFAULT_SKILL_PROFICIENCIES },
          })
        } else {
          setStats(DEFAULT_STATS)
        }
        setLoading(false)
      },
      (err) => {
        console.error('Firebase character error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => {
      off(statsRef)
    }
  }, [username])

  // Update a single stat
  const updateStat = useCallback(async (
    statName: keyof CharacterStats,
    value: number
  ): Promise<void> => {
    if (!username) return

    // Clamp value between 1 and 30
    const clampedValue = Math.max(1, Math.min(30, value))

    try {
      const statsRef = ref(database, `characters/${username}/stats`)
      await set(statsRef, {
        ...stats,
        [statName]: clampedValue,
      })
    } catch (err) {
      console.error('Error updating stat:', err)
      setError(err instanceof Error ? err.message : 'Failed to update stat')
    }
  }, [username, stats])

  // Update all stats at once
  const updateAllStats = useCallback(async (newStats: CharacterStats): Promise<void> => {
    if (!username) return

    try {
      const statsRef = ref(database, `characters/${username}/stats`)
      await set(statsRef, newStats)
    } catch (err) {
      console.error('Error updating stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to update stats')
    }
  }, [username])

  // Reset stats to default
  const resetStats = useCallback(async (): Promise<void> => {
    if (!username) return

    try {
      const statsRef = ref(database, `characters/${username}/stats`)
      await set(statsRef, DEFAULT_STATS)
    } catch (err) {
      console.error('Error resetting stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to reset stats')
    }
  }, [username])

  // Update a single skill proficiency
  const updateSkillProficiency = useCallback(async (
    skillName: keyof SkillProficiencies,
    level: SkillProficiency
  ): Promise<void> => {
    if (!username) return

    try {
      const updatedProficiencies = {
        ...(stats.skillProficiencies || DEFAULT_SKILL_PROFICIENCIES),
        [skillName]: level,
      }
      const statsRef = ref(database, `characters/${username}/stats`)
      await set(statsRef, {
        ...stats,
        skillProficiencies: updatedProficiencies,
      })
    } catch (err) {
      console.error('Error updating skill proficiency:', err)
      setError(err instanceof Error ? err.message : 'Failed to update skill')
    }
  }, [username, stats])

  return {
    stats,
    loading,
    error,
    updateStat,
    updateAllStats,
    resetStats,
    updateSkillProficiency,
  }
}
