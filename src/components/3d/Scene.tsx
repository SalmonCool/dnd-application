/**
 * Scene.tsx - Main 3D Scene Component
 * ====================================
 * This component sets up the Three.js 3D scene using React Three Fiber (R3F).
 *
 * REACT THREE FIBER OVERVIEW:
 * ---------------------------
 * R3F is a React renderer for Three.js. Instead of writing imperative Three.js code:
 *   const geometry = new THREE.BoxGeometry(1, 1, 1)
 *   const material = new THREE.MeshBasicMaterial({ color: 'red' })
 *   const mesh = new THREE.Mesh(geometry, material)
 *   scene.add(mesh)
 *
 * You write declarative JSX:
 *   <mesh>
 *     <boxGeometry args={[1, 1, 1]} />
 *     <meshBasicMaterial color="red" />
 *   </mesh>
 *
 * This makes 3D code feel like regular React - components, props, and all!
 */

/**
 * Canvas Import
 * -------------
 * The Canvas component from @react-three/fiber is the root of any R3F scene.
 * It creates the WebGL context and sets up the render loop automatically.
 * Everything inside <Canvas> exists in 3D space, not regular DOM.
 */
import { Canvas } from '@react-three/fiber'

/**
 * Drei Helpers
 * ------------
 * @react-three/drei ("drei" means "three" in German) provides pre-built
 * components and helpers that make common 3D tasks much easier.
 *
 * OrbitControls - Lets users rotate, zoom, and pan the camera with mouse/touch
 * Environment - Adds environmental lighting/reflections for realistic materials
 * PerspectiveCamera - A camera with perspective (things get smaller with distance)
 */
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei'

/**
 * React Suspense
 * --------------
 * Suspense lets you show a fallback while waiting for async content to load.
 * In 3D, this is used for loading models, textures, and environments.
 *
 * LEARNING POINT: Without Suspense, your app might show nothing while loading,
 * or crash. Suspense catches the loading state gracefully.
 */
import { Suspense } from 'react'

/**
 * D20Dice Component Import
 * ------------------------
 * Our custom component for the interactive 20-sided dice.
 */
import D20Dice from './D20Dice'

/**
 * Scene Component
 * ---------------
 * Sets up the complete 3D scene with:
 * - Camera and controls
 * - Lighting (ambient + directional)
 * - Environment for reflections
 * - Our D20 dice
 * - A ground plane for shadows
 */
export default function Scene() {
  return (
    /**
     * Canvas Component
     * ----------------
     * The container for all 3D content. Props:
     *   - shadows: Enable shadow mapping (objects can cast/receive shadows)
     *
     * The Canvas automatically:
     *   - Creates a WebGL renderer
     *   - Sets up a render loop (60fps animation)
     *   - Handles resizing
     *   - Creates a default scene and camera (if not specified)
     */
    <Canvas shadows>
      {/**
       * Camera Setup
       * ------------
       * PerspectiveCamera creates a camera that mimics human vision:
       *   - Objects further away appear smaller
       *   - Has a field of view (FOV)
       *
       * makeDefault: Makes this the active camera (instead of R3F's default)
       * position: [x, y, z] coordinates - here we're 2 units up and 5 units back
       *
       * COORDINATE SYSTEM:
       *   - x: left (-) to right (+)
       *   - y: down (-) to up (+)
       *   - z: into screen (-) to toward viewer (+)
       */}
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />

      {/**
       * OrbitControls
       * -------------
       * Lets users interact with the scene:
       *   - Left mouse drag: Rotate around the center
       *   - Right mouse drag: Pan (move the view)
       *   - Scroll wheel: Zoom in/out
       *
       * All controls are enabled by default, but we're being explicit here.
       * You might disable some for certain UIs (e.g., enablePan={false})
       */}
      <OrbitControls
        //1-2-2026 Disabled Orbital Controls
        enablePan={false}
        enableZoom={false}
        enableRotate={true}
      />

      {/**
       * LIGHTING
       * ========
       * 3D scenes need lights to see anything! There are several types:
       *
       * ambientLight: Lights everything equally from all directions.
       *   - No shadows
       *   - Prevents areas from being completely black
       *   - intensity: Brightness (0 = off, 1 = full)
       */}
      <ambientLight intensity={3} />

      {/**
       * directionalLight: Parallel rays from a direction (like the sun)
       *   - Can cast shadows
       *   - position: Where the light "comes from" (affects shadow direction)
       *   - castShadow: Enable this light to create shadows
       *   - shadow-mapSize: Resolution of shadow texture (higher = sharper shadows)
       *
       * LEARNING POINT: For shadows to work, you need:
       *   1. Canvas with shadows prop
       *   2. Light with castShadow
       *   3. Objects with castShadow (caster) and receiveShadow (receiver)
       */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/**
       * Suspense Boundary
       * -----------------
       * Wraps components that load assets asynchronously.
       * fallback={null} means show nothing while loading.
       * You could show a loading spinner: fallback={<LoadingSpinner />}
       */}
      <Suspense fallback={null}>
        {/**
         * Environment
         * -----------
         * Adds an HDR environment map for realistic lighting and reflections.
         * preset: Use a built-in environment ("sunset", "dawn", "night", etc.)
         *
         * This makes metallic/reflective materials look much better!
         */}
        <Environment preset="sunset" />

        {/**
         * Our D20 Dice
         * ------------
         * Custom component that renders an interactive 20-sided dice.
         * position={[x, y, z]} sets where it appears in the scene.
         */}
        <D20Dice position={[0, 0, 0]} />

        {/**
         * Ground Plane
         * ------------
         * A flat surface to catch shadows and give visual grounding.
         *
         * <mesh> is the basic 3D object in Three.js, combining:
         *   - geometry (shape)
         *   - material (appearance)
         *
         * rotation: [x, y, z] in radians. -Math.PI/2 = -90 degrees on X axis
         *           This rotates the plane from vertical to horizontal.
         *
         * receiveShadow: This mesh will show shadows cast onto it.
         */}
        <mesh rotation={[0, 0, 0]} position={[0, 0, -1]} receiveShadow>
          {/**
           * planeGeometry
           * -------------
           * A flat 2D shape. args={[width, height]}
           *
           * LEARNING POINT: In R3F, constructor arguments go in the 'args' prop.
           * new THREE.PlaneGeometry(20, 20) becomes <planeGeometry args={[20, 20]} />
           */}
          <planeGeometry args={[20, 20]} />

          {/**
           * meshStandardMaterial
           * --------------------
           * A physically-based material that responds realistically to lights.
           * Other common materials:
           *   - meshBasicMaterial: No lighting, flat color
           *   - meshLambertMaterial: Matte, non-shiny surface
           *   - meshPhongMaterial: Shiny surface with specular highlights
           */}
          <meshStandardMaterial color="rgba(0, 0, 0, 0)" />
        </mesh>
      </Suspense>
    </Canvas>
  )
}
