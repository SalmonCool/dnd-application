/**
 * Character Type Definitions
 * ==========================
 * TypeScript interfaces for D&D character sheet
 */

export type SkillProficiency = 'none' | 'proficient' | 'expert'

export type AbilityKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'

export interface SkillProficiencies {
  acrobatics: SkillProficiency
  sleightOfHand: SkillProficiency
  stealth: SkillProficiency
  animalHandling: SkillProficiency
  insight: SkillProficiency
  medicine: SkillProficiency
  perception: SkillProficiency
  survival: SkillProficiency
  arcana: SkillProficiency
  history: SkillProficiency
  investigation: SkillProficiency
  nature: SkillProficiency
  religion: SkillProficiency
  athletics: SkillProficiency
  deception: SkillProficiency
  intimidation: SkillProficiency
  performance: SkillProficiency
  persuasion: SkillProficiency
}

export const DEFAULT_SKILL_PROFICIENCIES: SkillProficiencies = {
  acrobatics: 'none',
  sleightOfHand: 'none',
  stealth: 'none',
  animalHandling: 'none',
  insight: 'none',
  medicine: 'none',
  perception: 'none',
  survival: 'none',
  arcana: 'none',
  history: 'none',
  investigation: 'none',
  nature: 'none',
  religion: 'none',
  athletics: 'none',
  deception: 'none',
  intimidation: 'none',
  performance: 'none',
  persuasion: 'none',
}

export interface SkillDefinition {
  key: keyof SkillProficiencies
  label: string
  ability: AbilityKey
}

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  { key: 'acrobatics', label: 'Acrobatics', ability: 'dexterity' },
  { key: 'sleightOfHand', label: 'Sleight of Hand', ability: 'dexterity' },
  { key: 'stealth', label: 'Stealth', ability: 'dexterity' },
  { key: 'animalHandling', label: 'Animal Handling', ability: 'wisdom' },
  { key: 'insight', label: 'Insight', ability: 'wisdom' },
  { key: 'medicine', label: 'Medicine', ability: 'wisdom' },
  { key: 'perception', label: 'Perception', ability: 'wisdom' },
  { key: 'survival', label: 'Survival', ability: 'wisdom' },
  { key: 'arcana', label: 'Arcana', ability: 'intelligence' },
  { key: 'history', label: 'History', ability: 'intelligence' },
  { key: 'investigation', label: 'Investigation', ability: 'intelligence' },
  { key: 'nature', label: 'Nature', ability: 'intelligence' },
  { key: 'religion', label: 'Religion', ability: 'intelligence' },
  { key: 'athletics', label: 'Athletics', ability: 'strength' },
  { key: 'deception', label: 'Deception', ability: 'charisma' },
  { key: 'intimidation', label: 'Intimidation', ability: 'charisma' },
  { key: 'performance', label: 'Performance', ability: 'charisma' },
  { key: 'persuasion', label: 'Persuasion', ability: 'charisma' },
]

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
}

export interface CharacterStats {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  level: number
  skillProficiencies?: SkillProficiencies
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
