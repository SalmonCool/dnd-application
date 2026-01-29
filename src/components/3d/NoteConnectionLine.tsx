/**
 * NoteConnectionLine Component
 * ============================
 * Renders a red cylinder connecting two notes in 3D space
 */

import { useMemo } from 'react'
import * as THREE from 'three'

interface NoteConnectionLineProps {
  from: { x: number; y: number; z: number }
  to: { x: number; y: number; z: number }
  onRemove?: () => void
}

export default function NoteConnectionLine({ from, to, onRemove }: NoteConnectionLineProps) {
  // Calculate the cylinder position, rotation, and length
  const { position, rotation, length } = useMemo(() => {
    const start = new THREE.Vector3(from.x, from.y, from.z)
    const end = new THREE.Vector3(to.x, to.y, to.z)

    // Midpoint for position
    const midpoint = new THREE.Vector3()
    midpoint.addVectors(start, end).multiplyScalar(0.5)

    // Length of the cylinder
    const distance = start.distanceTo(end)

    // Direction vector
    const direction = new THREE.Vector3()
    direction.subVectors(end, start).normalize()

    // Calculate rotation to align cylinder with direction
    // Cylinder default direction is Y-axis (0, 1, 0)
    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion()
    quaternion.setFromUnitVectors(up, direction)

    const euler = new THREE.Euler()
    euler.setFromQuaternion(quaternion)

    return {
      position: [midpoint.x, midpoint.y, midpoint.z - 0.02 /* Slight adjustment so that string is inside the tacks*/] as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      length: distance,
    }
  }, [from, to])

  const handleRightClick = (e: any) => {
    e.stopPropagation()
    // Only delete on shift+right click
    if (e.nativeEvent?.shiftKey && onRemove && confirm('Delete this connection?')) {
      onRemove()
    }
  }

  return (
    <mesh
      position={position}
      rotation={rotation}
      onContextMenu={handleRightClick}
    >
      <cylinderGeometry args={[0.03, 0.03, length, 8]} />
      <meshStandardMaterial
        color="#cc0000"
        metalness={0.3}
        roughness={0.4}
        emissive="#cc0000"
        emissiveIntensity={0.2}
      />
    </mesh>
  )
}
