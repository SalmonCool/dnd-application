/**
 * useNotes Hook
 * =============
 * Manages user notes with Firebase real-time sync
 * Notes are stored per-user based on username
 */

import { useState, useEffect, useCallback } from 'react'
import { database, ref, push, set, remove, onValue } from '../config/firebase'
import type { NotePage } from '../types/notes'

export function useNotes(username: string | null) {
  const [pages, setPages] = useState<NotePage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to user's notes
  useEffect(() => {
    if (!username) {
      setPages([])
      setLoading(false)
      return
    }

    const notesRef = ref(database, `notes/${username}/pages`)

    const unsubscribe = onValue(
      notesRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          const notePages: NotePage[] = Object.entries(data).map(([id, page]) => ({
            id,
            ...(page as Omit<NotePage, 'id'>),
          }))
          // Sort by updatedAt descending (most recent first)
          notePages.sort((a, b) => b.updatedAt - a.updatedAt)
          setPages(notePages)
        } else {
          setPages([])
        }
        setLoading(false)
      },
      (err) => {
        console.error('Error loading notes:', err)
        setError('Failed to load notes')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [username])

  // Create a new page
  const createPage = useCallback(async (title: string): Promise<string | null> => {
    if (!username) return null

    try {
      const notesRef = ref(database, `notes/${username}/pages`)
      const newPageRef = push(notesRef)
      const now = Date.now()

      await set(newPageRef, {
        title: title.trim() || 'Untitled',
        content: '',
        createdAt: now,
        updatedAt: now,
      })

      return newPageRef.key
    } catch (err) {
      console.error('Error creating page:', err)
      throw err
    }
  }, [username])

  // Update page title
  const updatePageTitle = useCallback(async (pageId: string, title: string) => {
    if (!username) return

    try {
      const pageRef = ref(database, `notes/${username}/pages/${pageId}`)
      const page = pages.find(p => p.id === pageId)
      if (page) {
        await set(pageRef, {
          ...page,
          title: title.trim() || 'Untitled',
          updatedAt: Date.now(),
        })
      }
    } catch (err) {
      console.error('Error updating page title:', err)
      throw err
    }
  }, [username, pages])

  // Update page content
  const updatePageContent = useCallback(async (pageId: string, content: string) => {
    if (!username) return

    try {
      const pageRef = ref(database, `notes/${username}/pages/${pageId}`)
      const page = pages.find(p => p.id === pageId)
      if (page) {
        await set(pageRef, {
          ...page,
          content,
          updatedAt: Date.now(),
        })
      }
    } catch (err) {
      console.error('Error updating page content:', err)
      throw err
    }
  }, [username, pages])

  // Delete a page
  const deletePage = useCallback(async (pageId: string) => {
    if (!username) return

    try {
      const pageRef = ref(database, `notes/${username}/pages/${pageId}`)
      await remove(pageRef)
    } catch (err) {
      console.error('Error deleting page:', err)
      throw err
    }
  }, [username])

  return {
    pages,
    loading,
    error,
    createPage,
    updatePageTitle,
    updatePageContent,
    deletePage,
  }
}
