/**
 * D20Dice.tsx - Interactive 20-Sided Dice Component
 * ==================================================
 * This component creates a clickable D20 (20-sided dice) that animates
 * when rolled and displays the result.
 *
 * KEY REACT CONCEPTS DEMONSTRATED:
 * - useState for managing component state
 * - useRef for referencing DOM/3D objects
 * - useFrame for animation loops
 * - Props with TypeScript interfaces
 * - Conditional rendering
 * - Event handling (onClick)
 */

/**
 * React Hooks Import
 * ------------------
 * useRef: Creates a mutable reference that persists across re-renders.
 *         Used here to reference the 3D mesh object for animation.
 *
 * useState: Creates state variables that trigger re-renders when changed.
 *           React's primary way to make components interactive.
 *
 * LEARNING POINT: Hooks are functions that let you "hook into" React features.
 * They all start with "use" and can only be called at the top level of components.
 */
import { useRef, useState } from 'react'

/**
 * useFrame Hook
 * -------------
 * R3F's animation hook - runs your code on every frame (60fps typically).
 * This is how you create smooth animations in Three.js.
 *
 * Arguments provided to the callback:
 *   - state: Contains the Three.js scene, camera, etc.
 *   - delta: Time in seconds since last frame (useful for frame-rate independent animation)
 */
import { useFrame } from '@react-three/fiber'

/**
 * Three.js Type Import
 * --------------------
 * 'Mesh' is the Three.js type for 3D objects.
 * We import it for TypeScript type safety with our ref.
 *
 * TYPESCRIPT TIP: Type imports help catch errors at compile time.
 * useRef<Mesh> tells TypeScript "this ref will point to a Mesh object"
 */
import { Mesh } from 'three'

/**
 * Text Component from Drei
 * ------------------------
 * Renders 3D text in the scene. Much easier than vanilla Three.js text!
 * Uses SDF (Signed Distance Field) for crisp text at any size.
 */
import { Text, Decal } from '@react-three/drei'

/**
 * Face Data for D20 Decals
 * ------------------------
 * Each entry contains position [x, y, z] and rotation [x, y, z] for placing
 * a number decal on each face. Adjust manually as needed.
 * Index 0 = face showing "1", Index 19 = face showing "20"
 */
const FACE_DATA: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }[] = [
  { position: [0, 0.5, -0.28], rotation: [-1.35, 0.00, 0], scale: [0.4, 0.4, 0.4] },   // 1 Done
  { position: [0.00, 0.5, 0.18], rotation: [-1.35, 0.00, 0], scale: [0.4, 0.4, 0.4] },     // 2 Done
  { position: [0.3, -0.3, 0.3], rotation: [0.9, 0.7, 0], scale: [0.4, 0.4, 0.4] },    // 3 Done
  { position: [-0.37, 0.3, -0.3], rotation: [-2, 0, 0], scale: [0.4, 0.4, 0.4] },  // 4 Done
  { position: [-.7, 0.2, 0.05], rotation: [0, -1, -0.06], scale: [0.4, 0.4, 0.4] },   // 5 Done
  { position: [.7, 0.2, 0.05], rotation: [0, 1, 0.1], scale: [0.4, 0.4, 0.4] },     // 6 Done
  { position: [-0.3, 0.01, 0.74], rotation: [0.0, -0.4, 0.5], scale: [0.4, 0.4, 0.4] },   // 7 Done
  { position: [-0.7, -0.26, 0], rotation: [0, -1.5, 0], scale: [0.4, 0.4, 0.4] },  // 8 Done
  { position: [-0.3, 0, -0.74], rotation: [0, 0.4, 0.5], scale: [-0.4, 0.4, 0.4] },  // 9 Done
  { position: [0.3, 0, -0.74], rotation: [0, -0.4, -0.5], scale: [-0.4, 0.4, 0.4] },    // 10 Done
  { position: [0, -0.5, -0.18], rotation: [-1.35, 0.00, 0], scale: [-0.4, 0.4, 0.4] },     // 11 Done
  { position: [0.37, 0.3, -0.3], rotation: [-2, 0, 0], scale: [0.4, 0.4, 0.4] },   // 12 Done
  { position: [0.00, -0.5, 0.18], rotation: [1.35, 0.00, 0], scale: [0.4, 0.4, 0.4] },  // 13 Done
  { position: [-0.3, 0.3, 0.3], rotation: [-0.9, -0.7, 0], scale: [0.4, 0.4, 0.4] },    // 14 Done
  { position: [0.7, -0.26, 0], rotation: [0, 1.5, 0], scale: [0.4, 0.4, 0.4] },    // 15 Done
  { position: [0.3, 0.01, 0.74], rotation: [0.0, 0.4, -0.5], scale: [0.4, 0.4, 0.4] },     // 16 Done
  { position: [-0.3, -0.3, -0.3], rotation: [-0.9, 0.7, 0], scale: [-0.4, 0.4, 0.4] },   // 17 Done
  { position: [-0.3, -0.3, 0.3], rotation: [0.9, -0.7, 0], scale: [0.4, 0.4, 0.4] },  // 18 Done
  { position: [0.3, -0.3, -0.3], rotation: [-0.9, -0.7, 0], scale: [-0.4, 0.4, 0.4] },    // 19 Done
  { position: [0.3, 0.3, 0.3], rotation: [-0.9, .7, 0], scale: [0.4, 0.4, 0.4] },     // 20 Done
]

/**
 * TypeScript Interface
 * --------------------
 * Defines the shape of props this component accepts.
 *
 * TYPESCRIPT BENEFIT: Autocomplete and error checking for component props.
 *
 * position?: The ? makes this prop optional (will use default if not provided)
 * [number, number, number]: A tuple type - exactly 3 numbers for [x, y, z]
 */
interface D20DiceProps {
  position?: [number, number, number]
}

/**
 * D20Dice Component
 * -----------------
 * Creates an interactive 20-sided dice.
 *
 * PROPS DESTRUCTURING:
 * { position = [0, 0, 0] } - Destructures props and sets a default value.
 * This is equivalent to:
 *   function D20Dice(props: D20DiceProps) {
 *     const position = props.position ?? [0, 0, 0]
 *   }
 */
export default function D20Dice({ position = [0, 0, 0] }: D20DiceProps) {
  /**
   * useRef Hook
   * -----------
   * Creates a reference to the mesh object.
   * We need this to manipulate the mesh directly (for rotation animation).
   *
   * <Mesh> is the TypeScript generic - tells TS what type of object this ref holds.
   * null is the initial value (the mesh doesn't exist until after first render).
   *
   * LEARNING POINT: refs are like an "escape hatch" to access DOM/3D objects directly.
   * In regular React, you'd use refs to access DOM elements.
   * In R3F, refs give you access to Three.js objects.
   */
  const meshRef = useRef<Mesh>(null)

  /**
   * useState Hook - isRolling
   * -------------------------
   * Tracks whether the dice is currently rolling/animating.
   *
   * useState returns an array with two elements:
   *   - Current state value (isRolling)
   *   - Function to update it (setIsRolling)
   *
   * Array destructuring: [value, setter] = useState(initialValue)
   *
   * LEARNING POINT: When state changes, React re-renders the component.
   * This is how React makes UIs reactive - change state, UI updates automatically!
   */
  const [isRolling, setIsRolling] = useState(false)

  /**
   * useState Hook - rollValue
   * -------------------------
   * Stores the result of the dice roll.
   *
   * <number | null> is a TypeScript union type:
   *   - Can be a number (1-20)
   *   - Or null (no roll yet / rolling in progress)
   */
  const [rollValue, setRollValue] = useState<number | null>(null)

  /**
   * Animation Loop with useFrame
   * ----------------------------
   * This function runs every frame (~60 times per second).
   *
   * Parameters:
   *   - _ (underscore): The "state" parameter - we're not using it, so we name it _
   *   - delta: Time elapsed since last frame in seconds
   *
   * FRAME-RATE INDEPENDENCE:
   * Multiplying by delta makes animation speed consistent regardless of frame rate.
   * delta * 5 means "rotate 5 radians per second" regardless of FPS.
   *
   * Without delta, animation would be faster on 144Hz monitors than 60Hz!
   */
  useFrame((_, delta) => {
    // Only animate if we have a mesh reference AND we're rolling
    if (meshRef.current && isRolling) {
      // Rotate on all three axes for a tumbling effect
      // Different speeds on each axis creates more natural-looking movement
      meshRef.current.rotation.x += delta * 5
      meshRef.current.rotation.y += delta * 7
      meshRef.current.rotation.z += delta * 3
    }
  })

  /**
   * Click Handler
   * -------------
   * Called when user clicks the dice.
   *
   * LEARNING POINT: In React, you typically define event handlers inside
   * the component so they have access to state and props via closure.
   */
  const handleClick = () => {
    // Prevent multiple rolls at once (guard clause)
    if (isRolling) return

    // Start the rolling animation
    setIsRolling(true)
    // Clear any previous result
    setRollValue(null)

    /**
     * setTimeout
     * ----------
     * JavaScript's way to delay code execution.
     * First argument: function to run
     * Second argument: delay in milliseconds (1500 = 1.5 seconds)
     *
     * After 1.5 seconds of rolling animation:
     * 1. Stop the animation
     * 2. Generate random result (1-20)
     * 3. Snap dice to a valid face-up rotation
     * 4. Display the result
     */
    setTimeout(() => {
      setIsRolling(false)
      // Math.random() returns 0-0.999..., multiply by 20, floor, add 1 = 1-20
      const result = Math.floor(Math.random() * 20) + 1
      setRollValue(result)

      // Snap the dice to a valid face-up orientation
      // We use the result (1-20) to pick a rotation, so each number has its own face
      if (meshRef.current) {
        const rotationIndex = result - 1 // Convert 1-20 to 0-19 index
        const [rx, ry, rz] = FACE_UP_ROTATIONS[rotationIndex]
        meshRef.current.rotation.set(rx, ry, rz)
      }
    }, 1500)
  }

  /**
 * Face-Up Rotations for D20
 * -------------------------
 * Each entry is [x, y, z] Euler rotation in radians.
 * Index 0 = roll of 1, Index 19 = roll of 20.
 * Fill in values manually through testing.
 */
const FACE_UP_ROTATIONS: [number, number, number][] = [
  [2, 0, 0], // 1 Done
  [1.2, 0, 0], // 2 Done
  [-0.7, -0.6, -0.2], // 3 Done
  [2, -0.3, -0.6], // 4 Done
  [1.6, 2.7, -1.2], // 5 Done
  [.5, -1.5, 0], // 6 Done
  [0, 0.45, 0], // 7 Done
  [-0.3, 1.6, 0], // 8 Done
  [1.7, 0.8, 1.2], // 9 Done
  [0, -2.7, 0], // 10
  [-1.2, 3.14, 0], // 11 Done
  [2, 0.3, 0.6], // 12 Done
  [-1.2, 0, 0], // 13 Done
  [0.7, 0.8, 0], // 14 Done
  [-0.3, -1.6, 0], // 15 Done
  [0, -0.45, 0], // 16 Done
  [-0.7, 2.5, 0.2], // 17 Done
  [-0.7, 0.6, 0.2], // 18 Done
  [-0.7, -2.5, -0.2], // 19
  [0.8, -0.8, 0], // 20 Done
]

  /**
   * Return JSX
   * ----------
   * Everything below is what gets rendered in the 3D scene.
   */
  return (
    /**
     * Group Component
     * ---------------
     * A container for grouping 3D objects together.
     * When you move/rotate a group, all children move with it.
     * Similar to a <div> for 3D objects.
     *
     * The position prop places this entire group at the specified coordinates.
     */
    <group position={position}>
      {/**
       * The Dice Mesh
       * -------------
       * mesh = geometry + material (shape + appearance)
       *
       * ref: Connects this mesh to our meshRef for animation control
       * onClick: Event handler triggered when user clicks
       * castShadow: This object will cast shadows on other objects
       * position: [0, 0.5, 0] lifts it slightly above ground
       */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        castShadow
        position={[0, 0.5, 0]}
      >
        {/**
         * Icosahedron Geometry
         * --------------------
         * A 20-faced polyhedron - perfect for a D20 dice!
         *
         * args={[radius, detail]}
         *   - radius: 0.8 units (size of the dice)
         *   - detail: 0 = low poly look (actual 20 faces)
         *             Higher numbers subdivide faces for smoother look
         */}
        <icosahedronGeometry args={[0.8, 0]} />

        {/**
         * Material with Conditional Color
         * --------------------------------
         * The color changes based on roll result:
         *   - Natural 20 (critical hit): Green
         *   - Natural 1 (critical fail): Bright red
         *   - Any other roll: Dark red (default)
         *
         * TERNARY OPERATORS:
         * condition ? valueIfTrue : valueIfFalse
         *
         * Nested ternary: rollValue === 20 ? green : (rollValue === 1 ? red : darkRed)
         *
         * metalness: How metallic the surface looks (0 = plastic, 1 = metal)
         * roughness: How rough/shiny the surface is (0 = mirror, 1 = matte)
         */}
        <meshStandardMaterial
          color={rollValue === 20 ? '#00ff00' : rollValue === 1 ? '#ff0000' : '#8b0000'}
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

      {/**
       * Conditional Rendering - Roll Result
       * ------------------------------------
       * Only shows the result text when:
       *   - rollValue is truthy (not null, not 0... but 0 is impossible for a d20)
       *   - AND not currently rolling
       *
       * CONDITIONAL RENDERING PATTERN:
       * {condition && <Component />}
       * If condition is true, render the component. If false, render nothing.
       *
       * This is a common React pattern for showing/hiding elements.
       */}
      {rollValue && !isRolling && (
        <Text
          position={[0, 2, 0]}
          fontSize={0.5}
          color={rollValue === 20 ? '#00ff00' : rollValue === 1 ? '#ff0000' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
        >
          {/**
           * Dynamic Text Content
           * --------------------
           * Using nested ternary to show different messages:
           *   - 20: "CRITICAL HIT!"
           *   - 1: "CRITICAL FAIL!"
           *   - Other: "Rolled: X"
           *
           * Template literal: `Rolled: ${rollValue}` embeds the variable in the string
           */}
          {rollValue === 20 ? 'CRITICAL HIT!' : rollValue === 1 ? 'CRITICAL FAIL!' : `Rolled: ${rollValue}`}
        </Text>
      )}

      {/**
       * Instructions Text
       * -----------------
       * Always visible text telling the user to click the dice.
       */}
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
