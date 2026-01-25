/**
 * Global Type Declarations
 * ========================
 * Extends the Window interface with custom properties used across the app
 */

declare global {
  interface Window {
    // Chat message tracking
    __onMessageCountChange?: (count: number) => void
    __onChatOpenChange?: (isOpen: boolean, messageCount: number) => void
    __currentMessageCount?: number

    // Chat functions
    __sendDiceRoll?: (diceType: string, result: number) => void
    __sendMultiplier?: (multiplier: number, newValue: number) => void
    __sendSpellCast?: (spellName: string, diceNotation: string, total: number, description?: string) => void
    __clearMessages?: () => void
    __logout?: () => void

    // YouTube API
    YT?: typeof YT
    onYouTubeIframeAPIReady?: () => void
  }
}

export {}
