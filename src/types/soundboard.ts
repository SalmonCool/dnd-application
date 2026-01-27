/**
 * Soundboard Type Definitions
 * ===========================
 * Types for the soundboard feature
 */

export interface SoundEffect {
  id: string
  title: string
  url: string
  hotkey: string | null  // e.g., 'A', 'B', '1', etc. (used with Ctrl+key)
  addedBy: string
  addedAt: number
}

export interface SoundPlayEvent {
  soundId: string
  url: string
  title: string
  playedBy: string
  playedAt: number
}
