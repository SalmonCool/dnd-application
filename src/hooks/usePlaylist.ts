/**
 * usePlaylist Hook
 * ================
 * Custom hook for real-time playlist synchronization with Firebase
 */

import { useState, useEffect } from 'react'
import { database, ref, push, remove, onValue, off, set } from '../config/firebase'
import type { PlaylistItem } from '../types/playlist'

export function usePlaylist() {
  const [items, setItems] = useState<PlaylistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const itemsRef = ref(database, 'playlist/items')

    // Subscribe to real-time updates
    onValue(
      itemsRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          // Convert object to array and sort by timestamp
          const itemArray: PlaylistItem[] = Object.entries(data).map(
            ([id, value]: [string, any]) => ({
              id,
              url: value.url,
              title: value.title || 'Untitled',
              addedBy: value.addedBy || 'Anonymous',
              addedAt: value.addedAt,
            })
          )
          // Sort items by timestamp (oldest first)
          itemArray.sort((a, b) => a.addedAt - b.addedAt)
          setItems(itemArray)
        } else {
          setItems([])
        }
        setLoading(false)
      },
      (err) => {
        console.error('Firebase playlist error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    // Cleanup: unsubscribe when component unmounts
    return () => {
      off(itemsRef)
    }
  }, [])

  const addItem = async (url: string, title: string, addedBy: string): Promise<void> => {
    if (!url.trim()) return

    try {
      const itemsRef = ref(database, 'playlist/items')
      await push(itemsRef, {
        url: url.trim(),
        title: title.trim() || 'Untitled',
        addedBy: addedBy.trim() || 'Anonymous',
        addedAt: Date.now(),
      })
    } catch (err) {
      console.error('Error adding playlist item:', err)
      setError(err instanceof Error ? err.message : 'Failed to add item')
    }
  }

  const removeItem = async (itemId: string): Promise<void> => {
    try {
      const itemRef = ref(database, `playlist/items/${itemId}`)
      await remove(itemRef)
    } catch (err) {
      console.error('Error removing playlist item:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove item')
    }
  }

  const clearPlaylist = async (): Promise<void> => {
    try {
      const itemsRef = ref(database, 'playlist/items')
      await remove(itemsRef)
    } catch (err) {
      console.error('Error clearing playlist:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear playlist')
    }
  }

  // Move item up or down in the playlist by swapping timestamps
  const moveItem = async (index: number, direction: 'up' | 'down'): Promise<void> => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    // Check bounds
    if (targetIndex < 0 || targetIndex >= items.length) return

    const currentItem = items[index]
    const targetItem = items[targetIndex]

    try {
      // Swap the addedAt timestamps
      const currentRef = ref(database, `playlist/items/${currentItem.id}/addedAt`)
      const targetRef = ref(database, `playlist/items/${targetItem.id}/addedAt`)

      await Promise.all([
        set(currentRef, targetItem.addedAt),
        set(targetRef, currentItem.addedAt),
      ])
    } catch (err) {
      console.error('Error moving playlist item:', err)
      setError(err instanceof Error ? err.message : 'Failed to move item')
    }
  }

  // Helper: Validate YouTube URL
  const isValidYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
      /(?:youtu\.be\/)([^\?\s]+)/,
      /(?:youtube\.com\/embed\/)([^\?\s]+)/,
    ]
    return patterns.some(pattern => pattern.test(url))
  }

  return {
    items,
    loading,
    error,
    addItem,
    removeItem,
    moveItem,
    clearPlaylist,
    isValidYouTubeUrl,
  }
}
