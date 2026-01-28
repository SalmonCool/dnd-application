/**
 * StickyNote3D Component
 * ======================
 * A 3D sticky note that displays text in the scene
 */

import { Text, Image } from '@react-three/drei'
import { Suspense } from 'react'
import type { Note3D } from '../../types/note'

interface StickyNote3DProps {
  note: Note3D
  onRemove?: (id: string) => void
  onThumbtackClick?: (noteId: string) => void
  isConnecting?: boolean
  isConnectionSource?: boolean
}

export default function StickyNote3D({
  note,
  onRemove,
  onThumbtackClick,
  isConnecting = false,
  isConnectionSource = false,
}: StickyNote3DProps) {
  const handleNoteClick = (e: any) => {
    e.stopPropagation()
    if (onRemove && confirm(`Delete note from ${note.createdBy}?`)) {
      onRemove(note.id)
    }
  }

  const handleThumbtackClick = (e: any) => {
    e.stopPropagation()
    if (onThumbtackClick) {
      onThumbtackClick(note.id)
    }
  }

  // Truncate text for display
  const displayText = note.text.length > 50
    ? note.text.substring(0, 47) + '...'
    : note.text

  // Check if note has an image
  const hasImage = !!note.imageUrl

  // Note dimensions - taller if there's an image
  const noteWidth = 1.5
  const noteHeight = hasImage ? 1.8 : 1

  // Thumbtack color changes when in connection mode
  const thumbtackColor = isConnectionSource
    ? '#00ff00' // Green when this is the source
    : isConnecting
      ? '#ffff00' // Yellow when waiting to be clicked as target
      : '#1f08a0' // Default blue thumb tack color

  // Calculate positions based on whether there's an image
  const thumbtackY = noteHeight / 2 - 0.08
  const textY = hasImage ? noteHeight / 2 - 0.25 : 0.2
  const imageY = hasImage ? -0.1 : 0
  const authorY = -noteHeight / 2 + 0.15

  return (
    <group position={[note.position.x, note.position.y, note.position.z]}>
      {/* Thumbtack */}
      <group position={[0, thumbtackY, 0.05]} rotation={[Math.PI / 2, -2, 0]}>
        {/* Thumbtack head - clickable */}
        <mesh onClick={handleThumbtackClick}>
          <cylinderGeometry args={[0.06, 0.06, 0.03, 16]} />
          <meshStandardMaterial
            color={thumbtackColor}
            metalness={0.3}
            roughness={0.4}
            emissive={isConnecting || isConnectionSource ? thumbtackColor : '#000000'}
            emissiveIntensity={isConnecting || isConnectionSource ? 0.3 : 0}
          />
        </mesh>
        {/* Thumbtack pin */}
        <mesh position={[0, -0.04, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.008, 0.08, 8]} />
          <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Note background */}
      <mesh onClick={handleNoteClick}>
        <planeGeometry args={[noteWidth, noteHeight]} />
        <meshStandardMaterial
          color={note.color}
          roughness={0.8}
        />
      </mesh>

      {/* Note text */}
      <Text
        position={[0, textY, 0.01]}
        fontSize={0.12}
        maxWidth={1}
        lineHeight={1.2}
        color="#1a1a1a"
        anchorX="center"
        anchorY="middle"
        textAlign="center"
      >
        {displayText}
      </Text>

      {/* Image if provided */}
      {hasImage && note.imageUrl && (
        <Suspense fallback={null}>
          <Image
            url={note.imageUrl}
            position={[0, imageY, 0.01]}
            scale={[1.2, 0.8]}
            transparent
          />
        </Suspense>
      )}

      {/* Author name */}
      <Text
        position={[0, authorY, 0.01]}
        fontSize={0.12}
        color="#555555"
        anchorX="center"
        anchorY="middle"
      >
        - {note.createdBy}
      </Text>
    </group>
  )
}
