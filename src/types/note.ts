/**
 * Note Types
 * ==========
 * Type definitions for 3D sticky notes in the scene
 */

export interface Note3D {
  id: string
  text: string
  position: {
    x: number
    y: number
    z: number
  }
  color: string
  imageUrl?: string
  createdBy: string
  createdAt: number
}

export interface NoteInput {
  text: string
  position: {
    x: number
    y: number
    z: number
  }
  color?: string
  imageUrl?: string
}

export interface NoteConnection {
  id: string
  fromNoteId: string
  toNoteId: string
  createdBy: string
  createdAt: number
}
