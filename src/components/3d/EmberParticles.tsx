/**
 * EmberParticles.tsx - Rising Ember Effect
 * =========================================
 * Small orange particles rising from the bottom of the 3D scene.
 * Used when the atmosphere is set to "ember".
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 150
const SCENE_WIDTH = 64
const SCENE_HEIGHT = 34
const HALF_W = SCENE_WIDTH / 2
const HALF_H = SCENE_HEIGHT / 2

export default function EmberParticles() {
  const pointsRef = useRef<THREE.Points>(null)

  // Initialize particle positions and velocities
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = new Float32Array(PARTICLE_COUNT * 2) // [riseSpeed, drift] per particle

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * SCENE_WIDTH     // x: spread across scene
      positions[i3 + 1] = (Math.random() - 0.5) * SCENE_HEIGHT // y: spread vertically (start distributed)
      positions[i3 + 2] = -4 + Math.random() * 2               // z: just in front of background

      const i2 = i * 2
      velocities[i2] = 1.0 + Math.random() * 1.5     // rise speed
      velocities[i2 + 1] = (Math.random() - 0.5) * 0.8 // horizontal drift (more than snow)
    }

    return { positions, velocities }
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [positions])

  useFrame((_, delta) => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const i2 = i * 2

      // Move up and drift horizontally
      posAttr.array[i3] += velocities[i2 + 1] * delta
      posAttr.array[i3 + 1] += velocities[i2] * delta

      // Reset to bottom when rising above scene
      if (posAttr.array[i3 + 1] > HALF_H) {
        posAttr.array[i3] = (Math.random() - 0.5) * SCENE_WIDTH
        posAttr.array[i3 + 1] = -HALF_H - Math.random() * 2
        posAttr.array[i3 + 2] = -4 + Math.random() * 2
      }

      // Wrap horizontally if drifted off screen
      if (posAttr.array[i3] > HALF_W) posAttr.array[i3] = -HALF_W
      if (posAttr.array[i3] < -HALF_W) posAttr.array[i3] = HALF_W
    }

    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#ff6600"
        size={0.08}
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
