/**
 * useSceneNotes Hook
 * ==================
 * Custom hook for real-time 3D scene note synchronization with Firebase
 * These are shared notes visible to all users in the 3D scene
 */

import { useState, useEffect } from 'react'
import { database, ref, push, remove, onValue, off } from '../config/firebase'
import type { Note3D, NoteInput, NoteConnection } from '../types/note'

export function useSceneNotes() {
  const [notes, setNotes] = useState<Note3D[]>([])
  const [connections, setConnections] = useState<NoteConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to notes
  useEffect(() => {
    const notesRef = ref(database, 'sceneNotes')

    onValue(
      notesRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          const noteArray: Note3D[] = Object.entries(data).map(
            ([id, value]: [string, any]) => ({
              id,
              text: value.text,
              position: value.position,
              color: value.color || '#ffeb3b',
              imageUrl: value.imageUrl || undefined,
              createdBy: value.createdBy || 'Anonymous',
              createdAt: value.createdAt,
            })
          )
          noteArray.sort((a, b) => a.createdAt - b.createdAt)
          setNotes(noteArray)
        } else {
          setNotes([])
        }
        setLoading(false)
      },
      (err) => {
        console.error('Firebase scene notes error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => {
      off(notesRef)
    }
  }, [])

  // Subscribe to connections
  useEffect(() => {
    const connectionsRef = ref(database, 'sceneNoteConnections')

    onValue(
      connectionsRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          const connectionArray: NoteConnection[] = Object.entries(data).map(
            ([id, value]: [string, any]) => ({
              id,
              fromNoteId: value.fromNoteId,
              toNoteId: value.toNoteId,
              createdBy: value.createdBy || 'Anonymous',
              createdAt: value.createdAt,
            })
          )
          setConnections(connectionArray)
        } else {
          setConnections([])
        }
      },
      (err) => {
        console.error('Firebase connections error:', err)
        setError(err.message)
      }
    )

    return () => {
      off(connectionsRef)
    }
  }, [])

  const addNote = async (input: NoteInput, username: string): Promise<void> => {
    if (!input.text.trim()) return

    try {
      const notesRef = ref(database, 'sceneNotes')
      const noteData: Record<string, any> = {
        text: input.text.trim(),
        position: input.position,
        color: input.color || '#ffeb3b',
        createdBy: username,
        createdAt: Date.now(),
      }
      // Only add imageUrl if provided
      if (input.imageUrl?.trim()) {
        noteData.imageUrl = input.imageUrl.trim()
      }
      await push(notesRef, noteData)
    } catch (err) {
      console.error('Error adding scene note:', err)
      setError(err instanceof Error ? err.message : 'Failed to add note')
    }
  }

  const removeNote = async (noteId: string): Promise<void> => {
    try {
      // Remove the note
      const noteRef = ref(database, `sceneNotes/${noteId}`)
      await remove(noteRef)

      // Also remove any connections involving this note
      const connectionsToRemove = connections.filter(
        (c) => c.fromNoteId === noteId || c.toNoteId === noteId
      )
      for (const conn of connectionsToRemove) {
        const connRef = ref(database, `sceneNoteConnections/${conn.id}`)
        await remove(connRef)
      }
    } catch (err) {
      console.error('Error removing scene note:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove note')
    }
  }

  const addConnection = async (
    fromNoteId: string,
    toNoteId: string,
    username: string
  ): Promise<void> => {
    // Don't allow connecting a note to itself
    if (fromNoteId === toNoteId) return

    // Check if connection already exists (in either direction)
    const exists = connections.some(
      (c) =>
        (c.fromNoteId === fromNoteId && c.toNoteId === toNoteId) ||
        (c.fromNoteId === toNoteId && c.toNoteId === fromNoteId)
    )
    if (exists) return

    try {
      const connectionsRef = ref(database, 'sceneNoteConnections')
      await push(connectionsRef, {
        fromNoteId,
        toNoteId,
        createdBy: username,
        createdAt: Date.now(),
      })
    } catch (err) {
      console.error('Error adding connection:', err)
      setError(err instanceof Error ? err.message : 'Failed to add connection')
    }
  }

  const removeConnection = async (connectionId: string): Promise<void> => {
    try {
      const connRef = ref(database, `sceneNoteConnections/${connectionId}`)
      await remove(connRef)
    } catch (err) {
      console.error('Error removing connection:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove connection')
    }
  }

  const clearAllNotes = async (): Promise<void> => {
    try {
      const notesRef = ref(database, 'sceneNotes')
      await remove(notesRef)
      const connectionsRef = ref(database, 'sceneNoteConnections')
      await remove(connectionsRef)
      console.log('All scene notes and connections cleared')
    } catch (err) {
      console.error('Error clearing scene notes:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear notes')
    }
  }

  return {
    notes,
    connections,
    loading,
    error,
    addNote,
    removeNote,
    addConnection,
    removeConnection,
    clearAllNotes,
  }
}
