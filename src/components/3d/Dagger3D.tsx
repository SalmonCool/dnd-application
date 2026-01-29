/**
 * Dagger3D Component
 * ==================
 * A 3D dagger that appears stabbed into the background
 */

import { Text } from '@react-three/drei'
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Dagger3D as DaggerType } from '../../types/dagger'

interface Dagger3DProps {
  dagger: DaggerType
  onRemove?: (id: string) => void
}

// Easing function for smooth animation
function easeOutQuad(t: number): number {
  return t * (2 - t)
}

function easeOutElastic(t: number): number {
  const p = 0.4
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1
}

export default function Dagger3D({ dagger, onRemove }: Dagger3DProps) {
  const textRef = useRef<THREE.Group>(null)
  const groupRef = useRef<THREE.Group>(null)
  const daggerRef = useRef<THREE.Group>(null)
  const [spawnTime] = useState(() => performance.now())
  const [animationComplete, setAnimationComplete] = useState(false)

  // Animation constants
  const ANIMATION_DURATION = 0.8 // Total animation time in seconds
  const TRAVEL_DURATION = 0.25 // Time to travel to target
  const START_Z_OFFSET = 3 // How far in front of target the dagger starts

  // Base rotation values
  const baseRotationX = Math.PI / 2
  const baseRotationY = 1
  const baseRotationZ = Math.PI

  useFrame((state) => {
    // Floating text animation
    if (textRef.current) {
      textRef.current.position.y = 0.35 + Math.sin(state.clock.elapsedTime * 2) * 0.03
    }

    // Spawn animation
    if (!animationComplete && groupRef.current && daggerRef.current) {
      const elapsed = (performance.now() - spawnTime) / 400 // Convert to seconds

      if (elapsed < ANIMATION_DURATION) {
        // Phase 1: Travel to target (0 to TRAVEL_DURATION)
        if (elapsed < TRAVEL_DURATION) {
          const travelProgress = easeOutQuad(elapsed / TRAVEL_DURATION)
          const zOffset = START_Z_OFFSET * (1 - travelProgress)
          groupRef.current.position.z = dagger.position.z + zOffset
        } else {
          // Ensure we're at final position
          groupRef.current.position.z = dagger.position.z
        }

        // Phase 2: Impact wobble (starts at TRAVEL_DURATION)
        if (elapsed >= TRAVEL_DURATION) {
          const wobbleElapsed = elapsed - TRAVEL_DURATION
          const wobbleDuration = ANIMATION_DURATION - TRAVEL_DURATION
          const wobbleProgress = wobbleElapsed / wobbleDuration

          // Damped oscillation for the tilt
          const dampening = Math.exp(-wobbleProgress * 5)
          const oscillation = Math.sin(wobbleProgress * Math.PI * 6) * dampening
          const tiltAmount = 0.15 * oscillation

          daggerRef.current.rotation.x = baseRotationX + tiltAmount
          daggerRef.current.rotation.z = baseRotationZ + tiltAmount * 0.5
        }
      } else {
        // Animation complete - set final values
        groupRef.current.position.z = dagger.position.z
        daggerRef.current.rotation.x = baseRotationX
        daggerRef.current.rotation.y = baseRotationY
        daggerRef.current.rotation.z = baseRotationZ
        setAnimationComplete(true)
      }
    }
  })

  const handleRightClick = (e: any) => {
    e.stopPropagation()
    // Shift+right click to remove
    if (e.nativeEvent?.shiftKey && onRemove && confirm(`Remove ${dagger.createdBy}'s dagger?`)) {
      onRemove(dagger.id)
    }
  }

  return (
    <group
      ref={groupRef}
      position={[dagger.position.x, dagger.position.y, dagger.position.z + START_Z_OFFSET]}
    >
      {/* Dagger group - rotated to stab into background (blade pointing into table) */}
      <group
        ref={daggerRef}
        rotation={[baseRotationX, baseRotationY, baseRotationZ]}
        scale={3}
        onContextMenu={handleRightClick}
      >
        {/* Blade - elongated diamond/kite shape */}
        <mesh position={[0, 0, 0.08]}>
          {/* Main blade body */}
          <boxGeometry args={[0.04, 0.35, 0.015]} />
          <meshStandardMaterial
            color="#c0c0c0"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Blade tip - pyramid */}
        <mesh position={[0, 0.22, 0.08]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.03, 0.1, 4]} />
          <meshStandardMaterial
            color="#d0d0d0"
            metalness={0.9}
            roughness={0.15}
          />
        </mesh>

        {/* Blade edge highlight - left */}
        <mesh position={[-0.022, 0.05, 0.08]}>
          <boxGeometry args={[0.003, 0.25, 0.018]} />
          <meshStandardMaterial
            color="#e8e8e8"
            metalness={0.95}
            roughness={0.1}
            emissive="#ffffff"
            emissiveIntensity={0.1}
          />
        </mesh>

        {/* Blade edge highlight - right */}
        <mesh position={[0.022, 0.05, 0.08]}>
          <boxGeometry args={[0.003, 0.25, 0.018]} />
          <meshStandardMaterial
            color="#e8e8e8"
            metalness={0.95}
            roughness={0.1}
            emissive="#ffffff"
            emissiveIntensity={0.1}
          />
        </mesh>

        {/* Crossguard */}
        <mesh position={[0, -0.12, 0.08]}>
          <boxGeometry args={[0.15, 0.025, 0.03]} />
          <meshStandardMaterial
            color="#8b4513"
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>

        {/* Crossguard decorative ends - left */}
        <mesh position={[-0.08, -0.12, 0.08]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial
            color="#ffd700"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>

        {/* Crossguard decorative ends - right */}
        <mesh position={[0.08, -0.12, 0.08]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial
            color="#ffd700"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>

        {/* Handle/Grip */}
        <mesh position={[0, -0.22, 0.08]}>
          <cylinderGeometry args={[0.02, 0.025, 0.15, 8]} />
          <meshStandardMaterial
            color="#4a3728"
            metalness={0.1}
            roughness={0.9}
          />
        </mesh>

        {/* Handle wrap detail */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, -0.17 - i * 0.03, 0.08]}>
            <torusGeometry args={[0.022, 0.004, 8, 16]} />
            <meshStandardMaterial
              color="#2d1f14"
              metalness={0.1}
              roughness={0.8}
            />
          </mesh>
        ))}

        {/* Pommel */}
        <mesh position={[0, -0.32, 0.08]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial
            color="#ffd700"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* Floating name text */}
      <group ref={textRef} position={[0.2, 0.35, 0.1]}>
        <Text
          fontSize={0.2}
          color="#ffd700"
          anchorX="left"
          anchorY="middle"
          outlineWidth={0.004}
          outlineColor="#000000"
        >
          {dagger.createdBy}
        </Text>
      </group>
    </group>
  )
}
