/**
 * useArtChannel Hook
 * ==================
 * Manages art gallery items with Firebase real-time sync
 */

import { useState, useEffect, useCallback } from 'react'
import { database, ref, push, remove, onValue, query, orderByChild } from '../config/firebase'
import type { ArtItem } from '../types/art'

export function useArtChannel() {
  const [items, setItems] = useState<ArtItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to art items
  useEffect(() => {
    const artRef = ref(database, 'artChannel/items')
    const artQuery = query(artRef, orderByChild('addedAt'))

    const unsubscribe = onValue(
      artQuery,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          const artItems: ArtItem[] = Object.entries(data).map(([id, item]) => ({
            id,
            ...(item as Omit<ArtItem, 'id'>),
          }))
          // Sort by addedAt descending (newest first)
          artItems.sort((a, b) => b.addedAt - a.addedAt)
          setItems(artItems)
        } else {
          setItems([])
        }
        setLoading(false)
      },
      (err) => {
        console.error('Error loading art items:', err)
        setError('Failed to load art gallery')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // Add new art item
  const addItem = useCallback(async (imageUrl: string, description: string, addedBy: string) => {
    try {
      const artRef = ref(database, 'artChannel/items')
      await push(artRef, {
        imageUrl: imageUrl.trim(),
        description: description.trim() || null,
        addedBy,
        addedAt: Date.now(),
      })
    } catch (err) {
      console.error('Error adding art item:', err)
      throw err
    }
  }, [])

  // Remove art item
  const removeItem = useCallback(async (itemId: string) => {
    try {
      const itemRef = ref(database, `artChannel/items/${itemId}`)
      await remove(itemRef)
    } catch (err) {
      console.error('Error removing art item:', err)
      throw err
    }
  }, [])

  // Clear all art items
  const clearAll = useCallback(async () => {
    try {
      const artRef = ref(database, 'artChannel/items')
      await remove(artRef)
    } catch (err) {
      console.error('Error clearing art channel:', err)
      throw err
    }
  }, [])

  // Validate image URL (basic check)
  const isValidImageUrl = useCallback((url: string): boolean => {
    if (!url.trim()) return false
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }, [])

  return {
    items,
    loading,
    error,
    addItem,
    removeItem,
    clearAll,
    isValidImageUrl,
  }
}
