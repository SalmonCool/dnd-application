/**
 * Notes Type Definitions
 * ======================
 * Types for the note-taking feature
 */

export interface NotePage {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface UserNotes {
  pages: NotePage[]
}
