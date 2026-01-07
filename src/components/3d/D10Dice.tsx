/**
 * D10Dice.tsx - Interactive 10-Sided Dice Component
 * =================================================
 * This component creates a clickable D10 (10-sided dice/pentagonal trapezohedron)
 * that animates when rolled and displays the result.
 *
 * Note: D10 uses a custom geometry as Three.js doesn't have a built-in pentagonal
 * trapezohedron. The geometry is created using BufferGeometry with calculated vertices.
 */

import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, MathUtils, BufferGeometry, Float32BufferAttribute } from 'three'
import { Text, Decal } from '@react-three/drei'

/**
 * Creates a D10 (pentagonal trapezohedron) geometry
 * A D10 has 10 kite-shaped faces arranged around a central axis
 */
function createD10Geometry(radius: number = 0.8): BufferGeometry {
  const geometry = new BufferGeometry()

  // D10 vertices: top point, bottom point, and two rings of 5 vertices
  const topHeight = radius * 0.9
  const bottomHeight = -radius * 0.9
  const upperRingHeight = radius * 0.3
  const lowerRingHeight = -radius * 0.3
  const upperRadius = radius * 0.7
  const lowerRadius = radius * 0.7

  const vertices: number[] = []
  const indices: number[] = []

  // Top vertex (index 0)
  vertices.push(0, topHeight, 0)

  // Bottom vertex (index 1)
  vertices.push(0, bottomHeight, 0)

  // Upper ring vertices (indices 2-6)
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5
    vertices.push(
      Math.cos(angle) * upperRadius,
      upperRingHeight,
      Math.sin(angle) * upperRadius
    )
  }

  // Lower ring vertices (indices 7-11), offset by 36 degrees
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 + Math.PI / 5
    vertices.push(
      Math.cos(angle) * lowerRadius,
      lowerRingHeight,
      Math.sin(angle) * lowerRadius
    )
  }

  // Create faces (10 kite-shaped faces, each made of 2 triangles)
  for (let i = 0; i < 5; i++) {
    const upperCurrent = 2 + i
    const upperNext = 2 + ((i + 1) % 5)
    const lowerCurrent = 7 + i
    const lowerPrev = 7 + ((i + 4) % 5)

    // Upper faces (connecting to top vertex)
    indices.push(0, upperNext, upperCurrent)
    indices.push(upperCurrent, upperNext, lowerCurrent)

    // Lower faces (connecting to bottom vertex)
    indices.push(1, lowerPrev, lowerCurrent)
    indices.push(lowerCurrent, lowerPrev, upperCurrent)
  }

  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return geometry
}

/**
 * Face Data for D10 Decals
 * ------------------------
 * Each entry contains position [x, y, z] and rotation [x, y, z] for placing
 * a number decal on each face. Adjust manually as needed.
 * Index 0 = face showing "1" (or "0"), Index 9 = face showing "10" (or "9")
 *
 * TODO: Fill in correct positions/rotations through manual testing
 */
const FACE_DATA: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }[] = [
  { position: [0, 0.5, 0.4], rotation: [0.3, 0, 0], scale: [0.25, 0.25, 0.25] },       // 1 - TODO: Adjust
  { position: [0.38, 0.5, 0.12], rotation: [0.3, 0.6, 0], scale: [0.25, 0.25, 0.25] }, // 2 - TODO: Adjust
  { position: [0.24, 0.5, -0.32], rotation: [0.3, 1.2, 0], scale: [0.25, 0.25, 0.25] },// 3 - TODO: Adjust
  { position: [-0.24, 0.5, -0.32], rotation: [0.3, -1.2, 0], scale: [0.25, 0.25, 0.25] },// 4 - TODO: Adjust
  { position: [-0.38, 0.5, 0.12], rotation: [0.3, -0.6, 0], scale: [0.25, 0.25, 0.25] },// 5 - TODO: Adjust
  { position: [0, -0.5, -0.4], rotation: [-0.3, Math.PI, 0], scale: [0.25, 0.25, 0.25] },// 6 - TODO: Adjust
  { position: [-0.38, -0.5, -0.12], rotation: [-0.3, -2.5, 0], scale: [0.25, 0.25, 0.25] },// 7 - TODO: Adjust
  { position: [-0.24, -0.5, 0.32], rotation: [-0.3, -1.9, 0], scale: [0.25, 0.25, 0.25] },// 8 - TODO: Adjust
  { position: [0.24, -0.5, 0.32], rotation: [-0.3, 1.9, 0], scale: [0.25, 0.25, 0.25] },// 9 - TODO: Adjust
  { position: [0.38, -0.5, -0.12], rotation: [-0.3, 2.5, 0], scale: [0.25, 0.25, 0.25] },// 10 - TODO: Adjust
]

/**
 * Face-Up Rotations for D10
 * -------------------------
 * Each entry is [x, y, z] Euler rotation in radians.
 * Index 0 = roll of 1, Index 9 = roll of 10.
 *
 * TODO: Fill in values manually through testing
 */
const FACE_UP_ROTATIONS: [number, number, number][] = [
  [0, 0, 0],                          // 1 - TODO: Adjust
  [0, -Math.PI * 2 / 5, 0],           // 2 - TODO: Adjust
  [0, -Math.PI * 4 / 5, 0],           // 3 - TODO: Adjust
  [0, Math.PI * 4 / 5, 0],            // 4 - TODO: Adjust
  [0, Math.PI * 2 / 5, 0],            // 5 - TODO: Adjust
  [Math.PI, 0, 0],                    // 6 - TODO: Adjust
  [Math.PI, -Math.PI * 2 / 5, 0],     // 7 - TODO: Adjust
  [Math.PI, -Math.PI * 4 / 5, 0],     // 8 - TODO: Adjust
  [Math.PI, Math.PI * 4 / 5, 0],      // 9 - TODO: Adjust
  [Math.PI, Math.PI * 2 / 5, 0],      // 10 - TODO: Adjust
]

interface D10DiceProps {
  position?: [number, number, number]
  onRollComplete?: (value: number) => void
  displayValue?: number | null
}

export default function D10Dice({ position = [0, 0, 0], onRollComplete, displayValue }: D10DiceProps) {
  const meshRef = useRef<Mesh>(null)

  // Create D10 geometry once using useMemo
  const d10Geometry = useMemo(() => createD10Geometry(0.8), [])

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
      const result = Math.floor(Math.random() * 10) + 1
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
        geometry={d10Geometry}
      >
        <meshStandardMaterial
          color={rollValue === 10 ? '#00ff00' : rollValue === 1 ? '#ff0000' : '#8b0000'}
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
                  ctx.font = 'bold 36px Arial'
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
          color={rollValue === 10 ? '#00ff00' : rollValue === 1 ? '#ff0000' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
        >
          {rollValue === 10 ? 'MAX ROLL!' : rollValue === 1 ? 'MIN ROLL!' : `Rolled: ${displayValue ?? rollValue}`}
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
