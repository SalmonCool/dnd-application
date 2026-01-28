/**
 * Character Type Definitions
 * ==========================
 * TypeScript interfaces for D&D character sheet
 */

export interface CharacterStats {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  level: number
}

export interface CharacterSheet {
  stats: CharacterStats
  updatedAt: number
}

/**
 * Calculate the modifier for a stat value
 * Base 10 = +0, every 2 points above/below changes by 1
 * Odd numbers don't affect the modifier
 */
export function calculateModifier(statValue: number): number {
  return Math.floor((statValue - 10) / 2)
}

/**
 * Format modifier as a string with + or - prefix
 */
export function formatModifier(modifier: number): string {
  if (modifier >= 0) {
    return `+${modifier}`
  }
  return `${modifier}`
}

/**
 * Calculate proficiency bonus from character level
 * Levels 1-4: +2, 5-8: +3, 9-12: +4, 13-16: +5, 17-20: +6
 */
export function calculateProficiencyBonus(level: number): number {
  if (level < 1) return 2
  if (level > 20) return 6
  return Math.floor((level - 1) / 4) + 2
}
