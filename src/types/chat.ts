/**
 * Chat Type Definitions
 * =====================
 * TypeScript interfaces for chat feature
 */

export type MessageType = 'text' | 'dice_roll' | 'multiplier'

export interface ChatMessage {
  id: string
  text: string
  timestamp: number
  username: string
  type: MessageType
  diceType?: string
  result?: number
}
