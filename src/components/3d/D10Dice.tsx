/**
 * D10Dice.tsx - Interactive 10-Sided Dice Component
 * =================================================
 * This component creates a clickable D10 (10-sided dice/pentagonal trapezohedron)
 * that animates when rolled and displays the result.
 *
 * Note: D10 uses a custom geometry as Three.js doesn't have a built-in pentagonal
 * trapezohedron. The geometry is created using BufferGeometry with calculated vertices.
 */

import { useRef, useState, useMemo, useEffect } from 'react'
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
  // Using proper pentagonal trapezohedron proportions
  const topHeight = radius * 1.0
  const bottomHeight = -radius * 1.0
  const upperRingHeight = radius * 0.001
  const lowerRingHeight = -radius * 0.001
  const ringRadius = radius * 0.85

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
      Math.cos(angle) * ringRadius,
      upperRingHeight,
      Math.sin(angle) * ringRadius
    )
  }

  // Lower ring vertices (indices 7-11), offset by 36 degrees
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 //+ Math.PI / 5 (Removed 36 degree offset)
    vertices.push(
      Math.cos(angle) * ringRadius,
      lowerRingHeight,
      Math.sin(angle) * ringRadius
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
 * a number decal on each face.
 * Index 0 = face showing "1", Index 9 = face showing "10"
 */
const FACE_DATA: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }[] = [
  // Upper faces (1-5) - radiating from top vertex at angles 0°, 72°, 144°, 216°, 288°
  { position: [-0.1, 0.3, 0.3], rotation: [0, 0, -0.2], scale: [0.3, 0.3, 0.3] },           // 1 - 0°
  { position: [-0.35, 0.3, 0], rotation: [0, Math.PI/2, 0], scale: [-0.3, 0.3, 0.3] }, // 2 - 72°
  { position: [-0.1, 0.3, -0.3], rotation: [0, 0, -0.1], scale: [-0.3, 0.3, 0.3] },// 3 - 144°
  { position: [0.35, 0.3, 0.25], rotation: [0, Math.PI/3, 0], scale: [0.3, 0.3, 0.3] },// 4 - 216°
  { position: [0.35, 0.3, -0.25], rotation: [0, -Math.PI/3, 0], scale: [-0.3, 0.3, 0.3] },// 5 - 288°

  // Lower faces (6-10) - radiating from bottom vertex, same angles
  { position: [-0.1, -0.3, 0.3], rotation: [0, 0, 0.1], scale: [0.3, 0.3, 0.3] },          // 6 - 0°
  { position: [-0.35, -0.3, 0], rotation: [0, Math.PI/2, 0], scale: [-0.3, 0.3, 0.3] }, // 7 - 72°
  { position: [-0.1, -0.3, -0.3], rotation: [0, 0, 0], scale: [-0.3, 0.3, 0.3] },// 8 - 144°
  { position: [0.35, -0.3, 0.25], rotation: [0, Math.PI/3, 0], scale: [0.3, 0.3, 0.3] },// 9 - 216°
  { position: [0.35, -0.3, -0.25], rotation: [0, -Math.PI/3, 0], scale: [-0.3, 0.3, 0.3] },// 10 - 288°
]

/**
 * Face-Up Rotations for D10
 * -------------------------
 * Each entry is [x, y, z] Euler rotation in radians.
 * Index 0 = roll of 1, Index 9 = roll of 10.
 */
const FACE_UP_ROTATIONS: [number, number, number][] = [
  // Upper faces (1-5) - slight tilt forward to show face + rotation around Y axis
  [0.3, Math.PI/12, 0], // 1
  [0.3, Math.PI/2, 0], // 2
  [0.3, Math.PI/1.1, 0], // 3
  [0.3, -Math.PI/3.5, 0], // 4
  [0.3, -Math.PI/1.5, 0], // 5

  // Lower faces (6-10) - flip dice + rotation around Y axis
  [-0.6, Math.PI/12, 0], // 6
  [-0.6, Math.PI/2, 0], // 7
  [-0.6, Math.PI/1.1, 0], // 8
  [-0.6, -Math.PI/3.5, 0], // 9
  [-0.6, -Math.PI/1.5, 0], // 10
]

interface D10DiceProps {
  position?: [number, number, number]
  onRollComplete?: (value: number) => void
  onStartRoll?: () => void
  displayValue?: number | null
  rollTrigger?: number
  instructionText?: string
}

export default function D10Dice({ position = [0, 0, 0], onRollComplete, onStartRoll, displayValue, rollTrigger = 0, instructionText = 'Click to roll' }: D10DiceProps) {
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
      const result = Math.floor(Math.random() * 10) + 1
      setRollValue(result)

      if (onRollComplete) {
        onRollComplete(result)
      }

      const rotationIndex = result - 1
      targetRotation.current = FACE_UP_ROTATIONS[rotationIndex]
      setIsSettling(true)
    }, 1500)
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
          fontSize={0.25}
          color={rollValue === 10 ? '#00ff00' : rollValue === 1 ? '#ff0000' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
        >
          {rollValue === 10 ? 'MAX!' : rollValue === 1 ? 'MIN!' : `${displayValue ?? rollValue}`}
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
        {instructionText}
      </Text>
    </group>
  )
}
