/**
 * Initiative Type Definitions
 * ===========================
 * TypeScript interfaces for D&D initiative order tracking
 */

export interface InitiativeEntry {
  id: string
  name: string
  initiative: number
  addedBy: string
  addedAt: number
}

export interface InitiativeState {
  currentTurnId: string | null  // ID of the entry whose turn it is
  updatedAt: number
}
