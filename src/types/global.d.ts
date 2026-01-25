/**
 * Global Type Declarations
 * ========================
 * Extends the Window interface with custom properties used across the app
 */

// YouTube Player interface
interface YTPlayer {
  loadVideoById: (videoId: string) => void
  playVideo: () => void
  pauseVideo: () => void
  destroy: () => void
  getPlaylist: () => string[]
  getPlaylistIndex: () => number
}

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
    __sendRollModifier?: (flatMod: number, bonusDie: string | null, bonusDieResult: number | null, newTotal: number) => void
    __clearMessages?: () => void
    __logout?: () => void

    // Roll modifier functions
    __getModifiers?: () => { flatModifier: number; bonusDie: string | null }
    __clearModifiers?: () => void

    // YouTube IFrame API
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          height?: string
          width?: string
          videoId?: string
          playerVars?: Record<string, number | string>
          events?: {
            onReady?: (event: { target: YTPlayer }) => void
            onStateChange?: (event: { data: number; target: YTPlayer }) => void
            onError?: (event: { data: number }) => void
          }
        }
      ) => YTPlayer
      PlayerState: {
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

export { YTPlayer }
