/**
 * Spell Type Definitions
 * ======================
 * TypeScript interfaces for spellbook feature
 */

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20'

export interface Spell {
  id: string
  name: string
  diceType: DiceType
  diceCount: number
  description?: string
  soundUrl?: string
  createdBy: string
  createdAt: number
}

export interface SpellCastEvent {
  id: string
  spellName: string
  soundUrl: string
  castBy: string
  timestamp: number
}
