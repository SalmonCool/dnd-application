/**
 * D6Dice.tsx - Interactive 6-Sided Dice Component
 * ================================================
 * This component creates a clickable D6 (6-sided dice) that animates
 * when rolled and displays the result.
 */

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, MathUtils } from 'three'
import { Text, Decal } from '@react-three/drei'

/**
 * Face Data for D6 Decals
 * -----------------------
 * Each entry contains position [x, y, z] and rotation [x, y, z] for placing
 * a number decal on each face. Adjust manually as needed.
 * Index 0 = face showing "1", Index 5 = face showing "6"
 *
 * For a cube with size 0.8, faces are at distance 0.4 from center
 */
const FACE_DATA: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }[] = [
  { position: [0, 0, 0.41], rotation: [0, 0, 0], scale: [0.3, 0.3, 0.3] },      // 1 - Front face (+Z)
  { position: [0.41, 0, 0], rotation: [0, Math.PI / 2, 0], scale: [0.3, 0.3, 0.3] },   // 2 - Right face (+X)
  { position: [0, 0.41, 0], rotation: [-Math.PI / 2, 0, 0], scale: [0.3, 0.3, 0.3] },  // 3 - Top face (+Y)
  { position: [0, -0.41, 0], rotation: [Math.PI / 2, 0, 0], scale: [0.3, 0.3, 0.3] },  // 4 - Bottom face (-Y)
  { position: [-0.41, 0, 0], rotation: [0, -Math.PI / 2, 0], scale: [0.3, 0.3, 0.3] }, // 5 - Left face (-X)
  { position: [0, 0, -0.41], rotation: [0, Math.PI, 0], scale: [0.3, 0.3, 0.3] },      // 6 - Back face (-Z)
]

/**
 * Face-Up Rotations for D6
 * ------------------------
 * Each entry is [x, y, z] Euler rotation in radians.
 * Index 0 = roll of 1, Index 5 = roll of 6.
 * Fill in values manually through testing.
 */
const FACE_UP_ROTATIONS: [number, number, number][] = [
  [0, 0, 0],           // 1 - Front face up
  [0, -Math.PI / 2, 0], // 2 - Right face up
  [Math.PI / 2, 0, 0],  // 3 - Top face up
  [-Math.PI / 2, 0, 0], // 4 - Bottom face up
  [0, Math.PI / 2, 0],  // 5 - Left face up
  [0, Math.PI, 0],      // 6 - Back face up
]

interface D6DiceProps {
  position?: [number, number, number]
  onRollComplete?: (value: number) => void
  displayValue?: number | null
}

export default function D6Dice({ position = [0, 0, 0], onRollComplete, displayValue }: D6DiceProps) {
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

  /**
   * Animation Loop
   */
  useFrame((_, delta) => {
    if (!meshRef.current) return

    // Rolling animation - tumble on all axes
    if (isRolling) {
      meshRef.current.rotation.x += delta * 5
      meshRef.current.rotation.y += delta * 7
      meshRef.current.rotation.z += delta * 3
    }

    // Settling animation - ease into final position
    if (isSettling) {
      const [tx, ty, tz] = targetRotation.current
      const lerpFactor = 25 * delta

      meshRef.current.rotation.x = MathUtils.lerp(meshRef.current.rotation.x, tx, lerpFactor)
      meshRef.current.rotation.y = MathUtils.lerp(meshRef.current.rotation.y, ty, lerpFactor)
      meshRef.current.rotation.z = MathUtils.lerp(meshRef.current.rotation.z, tz, lerpFactor)

      // Check if close enough to snap and stop settling
      const threshold = 0.1
      const dx = Math.abs(meshRef.current.rotation.x - tx)
      const dy = Math.abs(meshRef.current.rotation.y - ty)
      const dz = Math.abs(meshRef.current.rotation.z - tz)

      if (dx < threshold && dy < threshold && dz < threshold) {
        meshRef.current.rotation.set(tx, ty, tz)
        setIsSettling(false)

        // Play settle sound
        if (!settleSound.current) {
          settleSound.current = new Audio(SETTLE_SOUND_PATH)
        }
        settleSound.current.currentTime = 0.05
        settleSound.current.volume = 0.25
        settleSound.current.play().catch(() => {})
      }
    }
  })

  /**
   * Click Handler
   */
  const handleClick = () => {
    if (isRolling) return

    // Play roll sound
    if (!rollSound.current) {
      rollSound.current = new Audio(ROLL_SOUND_PATH)
    }
    rollSound.current.currentTime = 0.3
    rollSound.current.play().catch(() => {})

    setIsRolling(true)
    setRollValue(null)

    setTimeout(() => {
      setIsRolling(false)
      const result = Math.floor(Math.random() * 6) + 1
      setRollValue(result)

      // Notify parent of roll result
      if (onRollComplete) {
        onRollComplete(result)
      }

      // Start settling animation
      const rotationIndex = result - 1
      targetRotation.current = FACE_UP_ROTATIONS[rotationIndex]
      setIsSettling(true)
    }, 1500)
  }

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        castShadow
        position={[0, 0.5, 0]}
      >
        {/* Box geometry for D6 - cube with rounded appearance */}
        <boxGeometry args={[0.8, 0.8, 0.8]} />

        <meshStandardMaterial
          color={rollValue === 6 ? '#00ff00' : rollValue === 1 ? '#ff0000' : '#8b0000'}
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
          fontSize={0.5}
          color={rollValue === 6 ? '#00ff00' : rollValue === 1 ? '#ff0000' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
        >
          {rollValue === 6 ? 'MAX ROLL!' : rollValue === 1 ? 'MIN ROLL!' : `Rolled: ${displayValue ?? rollValue}`}
        </Text>
      )}

      {/* Instructions */}
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.15}
        color="#888888"
        anchorX="center"
        anchorY="middle"
      >
        Click to roll
      </Text>
    </group>
  )
}
