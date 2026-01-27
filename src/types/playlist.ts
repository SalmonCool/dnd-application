/**
 * Playlist Type Definitions
 * =========================
 * TypeScript interfaces for YouTube playlist feature
 */

export interface PlaylistItem {
  id: string
  url: string
  title: string
  addedBy: string
  addedAt: number
}

export interface PlaylistSyncState {
  musicLead: string | null       // Username of the music lead
  currentItemId: string | null   // ID of the currently playing item
  currentTime: number            // Current playback time in seconds
  isPlaying: boolean             // Whether the video is playing
  loopEnabled: boolean           // Whether loop is enabled
  updatedAt: number              // Timestamp when this was last updated
}
