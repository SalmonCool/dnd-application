/**
 * InteractiveBackground Component
 * ================================
 * Background plane that handles both desktop and mobile interactions:
 * - Desktop: Left-click for dagger, Right-click for notes
 * - Mobile: Tap for dagger, Long-press for notes
 */

import { useRef, useCallback } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

type AtmosphereType = 'none' | 'winter' | 'ember'

interface InteractiveBackgroundProps {
  onLeftClick?: (position: { x: number; y: number; z: number }) => void
  onRightClick?: (position: { x: number; y: number; z: number }) => void
  atmosphere?: AtmosphereType
}

export default function InteractiveBackground({
  onLeftClick,
  onRightClick,
  atmosphere = 'none',
}: InteractiveBackgroundProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const lastPointRef = useRef<THREE.Vector3 | null>(null)

  const LONG_PRESS_DELAY = 500 // ms
  const MOVE_THRESHOLD = 10 // pixels

  // Choose texture based on atmosphere
  const texturePath = atmosphere === 'winter'
    ? '/textures/wood-texture-rectangle-cold.png'
    : atmosphere === 'ember'
      ? '/textures/fire-texture.png'
      : '/textures/wood-texture-rectangle.png'

  // Load wood texture
  const woodTexture = useTexture(texturePath)
  woodTexture.wrapS = THREE.RepeatWrapping
  woodTexture.wrapT = THREE.RepeatWrapping
  woodTexture.repeat.set(3, 3)

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation()

    // Only process left-click (button 0) or touch events
    // Right-click (button 2) is handled by onContextMenu
    const button = e.nativeEvent?.button ?? 0
    if (button !== 0) return

    isLongPressRef.current = false
    lastPointRef.current = e.point.clone()

    // Store starting screen position
    if (e.nativeEvent) {
      startPosRef.current = {
        x: e.nativeEvent.clientX ?? e.nativeEvent.touches?.[0]?.clientX ?? 0,
        y: e.nativeEvent.clientY ?? e.nativeEvent.touches?.[0]?.clientY ?? 0,
      }
    }

    // Start long press timer
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      if (onRightClick && lastPointRef.current) {
        onRightClick({
          x: lastPointRef.current.x,
          y: lastPointRef.current.y,
          z: lastPointRef.current.z + 0.1,
        })
      }
    }, LONG_PRESS_DELAY)
  }, [onRightClick])

  const handlePointerUp = useCallback((e: any) => {
    e.stopPropagation()

    // Only process left-click (button 0) or touch events
    const button = e.nativeEvent?.button ?? 0
    if (button !== 0) return

    // Clear the timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    // If it wasn't a long press, trigger left click (dagger)
    if (!isLongPressRef.current && onLeftClick && lastPointRef.current) {
      onLeftClick({
        x: lastPointRef.current.x,
        y: lastPointRef.current.y,
        z: lastPointRef.current.z + 0.1,
      })
    }
  }, [onLeftClick])

  const handlePointerMove = useCallback((e: any) => {
    // Cancel long press if finger moves too much
    if (startPosRef.current && e.nativeEvent && timerRef.current) {
      const currentX = e.nativeEvent.clientX ?? e.nativeEvent.touches?.[0]?.clientX ?? 0
      const currentY = e.nativeEvent.clientY ?? e.nativeEvent.touches?.[0]?.clientY ?? 0

      const deltaX = Math.abs(currentX - startPosRef.current.x)
      const deltaY = Math.abs(currentY - startPosRef.current.y)

      if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    // Update last point for accurate position
    if (e.point) {
      lastPointRef.current = e.point.clone()
    }
  }, [])

  const handlePointerCancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleContextMenu = useCallback((e: any) => {
    e.stopPropagation()
    if (e.nativeEvent) {
      e.nativeEvent.preventDefault()
    }
    // On desktop, right-click triggers notes directly
    if (onRightClick) {
      onRightClick({
        x: e.point.x,
        y: e.point.y,
        z: e.point.z + 0.1,
      })
    }
  }, [onRightClick])

  return (
    <mesh
      rotation={[0, 0, 0]}
      position={[0, 0, -5]}
      receiveShadow={true}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      onContextMenu={handleContextMenu}
    >
      <planeGeometry args={[64, 34]} />
      <meshStandardMaterial map={woodTexture} color="#916f6f" roughness={0.7} metalness={0} />
    </mesh>
  )
}
