/**
 * D8Dice.tsx - Interactive 8-Sided Dice Component
 * ================================================
 * This component creates a clickable D8 (8-sided dice/octahedron) that animates
 * when rolled and displays the result.
 */

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, MathUtils } from 'three'
import { Text, Decal } from '@react-three/drei'

/**
 * Face Data for D8 Decals
 * -----------------------
 * Each entry contains position [x, y, z] and rotation [x, y, z] for placing
 * a number decal on each face.
 * Index 0 = face showing "1", Index 7 = face showing "8"
 * An octahedron has 8 triangular faces
 */
const FACE_DATA: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }[] = [
  { position: [0.3, 0.3, 0.3], rotation: [0, 0.8, 0], scale: [0.3, 0.3, 0.3] },      // 1
  { position: [-0.3, 0.3, 0.3], rotation: [0, -0.8, 0], scale: [0.3, 0.3, 0.3] },    // 2
  { position: [0.3, 0.3, -0.3], rotation: [3, 0.8, -3.14], scale: [0.3, 0.3, 0.3] },    // 3
  { position: [-0.3, 0.3, -0.3], rotation: [3, -0.8, -3.14], scale: [0.3, 0.3, 0.3] },  // 4
  { position: [0.3, -0.3, 0.3], rotation: [0, 0.8, 0], scale: [0.3, 0.3, 0.3] },    // 5
  { position: [-0.3, -0.3, 0.3], rotation: [0, -0.8, 0], scale: [0.3, 0.3, 0.3] },  // 6
  { position: [0.3, -0.3, -0.3], rotation: [1.6, 0.8, -2.2], scale: [0.3, 0.3, 0.3] },    // 7
  { position: [-0.3, -0.3, -0.3], rotation: [1.8, -0.8, 2.25], scale: [-0.3, 0.3, 0.3] },  // 8
]

/**
 * Face-Up Rotations for D8
 * ------------------------
 * Each entry is [x, y, z] Euler rotation in radians.
 * Index 0 = roll of 1, Index 7 = roll of 8.
 */
const FACE_UP_ROTATIONS: [number, number, number][] = [
  [0.5, -Math.PI/4, 0],          // 1
  [0.5, Math.PI/4, 0],           // 2
  [0.5, -3*(Math.PI/4), 0],      // 3
  [0.5, 3*(Math.PI/4), 0],       // 4
  [-0.5, -Math.PI/4, 0],         // 5
  [-0.5, Math.PI/4, 0],          // 6
  [-0.5, -3*(Math.PI/4), 0],     // 7
  [-0.5, 3*(Math.PI/4), 0],      // 8
]

interface D8DiceProps {
  position?: [number, number, number]
  onRollComplete?: (value: number) => void
  onStartRoll?: () => void
  displayValue?: number | null
  rollTrigger?: number
  instructionText?: string
}

export default function D8Dice({ position = [0, 0, 0], onRollComplete, onStartRoll, displayValue, rollTrigger = 0, instructionText = 'Click to roll' }: D8DiceProps) {
  const meshRef = useRef<Mesh>(null)

  /**
   * Sound Effects
   */
  const rollSound = useRef<HTMLAudioElement | null>(null)
  const settleSound = useRef<HTMLAudioElement | null>(null)
  const ROLL_SOUND_PATH = '/sounds/dice-roll.mp3'
  const SETTLE_SOUND_PATH = '/sounds/bell-ding.mp3'

  const [isRolling, setIsRolling] = useState(false)
  const [rollValue, setRollValue] = useState<number | null>(null)

  /**
   * Settling State & Target Rotation
   */
  const [isSettling, setIsSettling] = useState(false)
  const targetRotation = useRef<[number, number, number]>([0, 0, 0])
  const lastRollTrigger = useRef(rollTrigger)

  useEffect(() => {
    if (rollTrigger > 0 && rollTrigger !== lastRollTrigger.current && !isRolling) {
      lastRollTrigger.current = rollTrigger
      triggerRoll()
    }
  }, [rollTrigger])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    if (isRolling) {
      meshRef.current.rotation.x += delta * 5
      meshRef.current.rotation.y += delta * 7
      meshRef.current.rotation.z += delta * 3
    }

    if (isSettling) {
      const [tx, ty, tz] = targetRotation.current
      const lerpFactor = 25 * delta

      meshRef.current.rotation.x = MathUtils.lerp(meshRef.current.rotation.x, tx, lerpFactor)
      meshRef.current.rotation.y = MathUtils.lerp(meshRef.current.rotation.y, ty, lerpFactor)
      meshRef.current.rotation.z = MathUtils.lerp(meshRef.current.rotation.z, tz, lerpFactor)

      const threshold = 0.1
      const dx = Math.abs(meshRef.current.rotation.x - tx)
      const dy = Math.abs(meshRef.current.rotation.y - ty)
      const dz = Math.abs(meshRef.current.rotation.z - tz)

      if (dx < threshold && dy < threshold && dz < threshold) {
        meshRef.current.rotation.set(tx, ty, tz)
        setIsSettling(false)

        if (!settleSound.current) {
          settleSound.current = new Audio(SETTLE_SOUND_PATH)
        }
        settleSound.current.currentTime = 0.05
        settleSound.current.volume = (window.__getVolume?.('dice') ?? 1) * 0.25
        settleSound.current.play().catch(() => {})
      }
    }
  })

  const triggerRoll = () => {
    if (isRolling) return

    if (!rollSound.current) {
      rollSound.current = new Audio(ROLL_SOUND_PATH)
    }
    rollSound.current.currentTime = 0.3
    rollSound.current.volume = window.__getVolume?.('dice') ?? 1
    rollSound.current.play().catch(() => {})

    setIsRolling(true)
    setRollValue(null)

    setTimeout(() => {
      setIsRolling(false)
      const result = Math.floor(Math.random() * 8) + 1
      setRollValue(result)

      if (onRollComplete) {
        onRollComplete(result)
      }

      const rotationIndex = result - 1
      targetRotation.current = FACE_UP_ROTATIONS[rotationIndex]
      setIsSettling(true)
    }, 1500)
  }

  // Stop pointer events from reaching the background (prevents dagger throwing)
  const handlePointerDown = (e: any) => {
    e.stopPropagation()
  }

  const handlePointerUp = (e: any) => {
    e.stopPropagation()
  }

  const handleClick = (e: any) => {
    e.stopPropagation() // Prevent dagger from being thrown
    if (isRolling) return

    if (onStartRoll) {
      onStartRoll()
    } else {
      triggerRoll()
    }
  }

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        castShadow
        position={[0, 0.5, 0]}
      >
        {/* Octahedron geometry for D8 */}
        <octahedronGeometry args={[0.8, 0]} />

        <meshStandardMaterial
          color={rollValue === 8 ? '#00ff00' : rollValue === 1 ? '#ff0000' : '#8b0000'}
          metalness={0.3}
          roughness={0.4}
        />

        {/* Number decals for each face */}
        {FACE_DATA.map((face, index) => (
          <Decal
            key={index}
            position={face.position}
            rotation={face.rotation}
            scale={face.scale}
          >
            <meshBasicMaterial
              transparent
              polygonOffset
              polygonOffsetFactor={-1}
            >
              <canvasTexture
                attach="map"
                image={(() => {
                  const canvas = document.createElement('canvas')
                  canvas.width = 64
                  canvas.height = 64
                  const ctx = canvas.getContext('2d')!
                  ctx.fillStyle = 'white'
                  ctx.font = 'bold 40px Arial'
                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'middle'
                  ctx.fillText(String(index + 1), 32, 32)
                  return canvas
                })()}
              />
            </meshBasicMaterial>
          </Decal>
        ))}
      </mesh>

      {/* Roll Result Display */}
      {rollValue && !isRolling && (
        <Text
          position={[0, 2, 0]}
          fontSize={0.25}
          color={rollValue === 8 ? '#00ff00' : rollValue === 1 ? '#ff0000' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
        >
          {rollValue === 8 ? 'MAX!' : rollValue === 1 ? 'MIN!' : `${displayValue ?? rollValue}`}
        </Text>
      )}

      {/* Instructions */}
      <Text
        position={[0, -0.3, 0]}
        fontSize={0.15}
        color="#888888"
        anchorX="center"
        anchorY="middle"
      >
        {instructionText}
      </Text>
    </group>
  )
}
