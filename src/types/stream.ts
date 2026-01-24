/**
 * Stream Types
 * =============
 * Type definitions for WebRTC screen sharing
 */

export interface StreamState {
  streamerId: string
  streamerName: string
  active: boolean
  timestamp: number
}

export interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-request'
  from: string
  to?: string
  data: any
  timestamp: number
}
