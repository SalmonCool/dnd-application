/**
 * useLongPress Hook
 * =================
 * Detects long press gestures for mobile touch support
 * Returns handlers for pointer events
 */

import { useRef, useCallback } from 'react'

interface LongPressOptions {
  onLongPress: (e: any) => void
  onPress?: (e: any) => void
  delay?: number
}

export function useLongPress({ onLongPress, onPress, delay = 500 }: LongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)

  const start = useCallback((e: any) => {
    isLongPressRef.current = false

    // Store starting position to detect movement
    if (e.nativeEvent) {
      startPosRef.current = {
        x: e.nativeEvent.clientX || e.nativeEvent.touches?.[0]?.clientX || 0,
        y: e.nativeEvent.clientY || e.nativeEvent.touches?.[0]?.clientY || 0,
      }
    }

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onLongPress(e)
    }, delay)
  }, [onLongPress, delay])

  const cancel = useCallback((e: any) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    // If it wasn't a long press and we have an onPress handler, call it
    if (!isLongPressRef.current && onPress) {
      onPress(e)
    }
  }, [onPress])

  const move = useCallback((e: any) => {
    // Cancel long press if finger moves too much
    if (startPosRef.current && e.nativeEvent) {
      const currentX = e.nativeEvent.clientX || e.nativeEvent.touches?.[0]?.clientX || 0
      const currentY = e.nativeEvent.clientY || e.nativeEvent.touches?.[0]?.clientY || 0
      const moveThreshold = 10

      const deltaX = Math.abs(currentX - startPosRef.current.x)
      const deltaY = Math.abs(currentY - startPosRef.current.y)

      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }
    }
  }, [])

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onPointerMove: move,
  }
}
