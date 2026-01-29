/**
 * SkullArtifact.tsx - Mystical Floating Skull Component
 * =====================================================
 * A low-poly white skull with glowing green eyes.
 * Floats in the same manner as the ArtifactOrb.
 */

import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Mesh, Group, Vector3, ShaderMaterial, Color } from 'three'
import { Text } from '@react-three/drei'

// Skull bone shader - white base with flowing green waves
const skullVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skullFragmentShader = `
  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform vec3 uWaveColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    // Create multiple tight waves flowing across the surface
    float wave1 = sin((vPosition.x + vPosition.y + vPosition.z) * 15.0 + uTime * 2.0) * 0.5 + 0.5;
    float wave2 = sin((vPosition.x - vPosition.y + vPosition.z * 2.0) * 12.0 + uTime * 2.5) * 0.5 + 0.5;
    float wave3 = sin((vPosition.y * 2.0 + vPosition.z) * 18.0 + uTime * 1.8) * 0.5 + 0.5;

    // Combine waves
    float combinedWave = (wave1 * wave2 + wave3) * 0.5;

    // Sharpen the waves to create distinct bands
    combinedWave = smoothstep(0.3, 0.7, combinedWave);

    // Mix base color with wave color
    vec3 color = mix(uBaseColor, uWaveColor, combinedWave * 0.4);

    // Add subtle fresnel glow at edges
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    color += uWaveColor * fresnel * 0.3;

    gl_FragColor = vec4(color, 1.0);
  }
`

// Star particle interface
interface StarParticle {
  id: number
  position: Vector3
  velocity: Vector3
  life: number
  maxLife: number
  scale: number
}

// Star particle component (green themed)
function GreenStar({ position, opacity, scale }: { position: Vector3; opacity: number; scale: number }) {
  return (
    <mesh position={position} scale={scale}>
      <group>
        <mesh rotation={[0, 0, 0]}>
          <planeGeometry args={[0.15, 0.04]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={opacity} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[0.15, 0.04]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={opacity} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.1, 0.03]} />
          <meshBasicMaterial color="#90EE90" transparent opacity={opacity * 0.8} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <planeGeometry args={[0.1, 0.03]} />
          <meshBasicMaterial color="#90EE90" transparent opacity={opacity * 0.8} />
        </mesh>
      </group>
    </mesh>
  )
}

// Voicelines for the skull - spooky themed
const SKULL_VOICELINES = [
  '/sounds/artifacts/skull/laugh1.mp3',
  '/sounds/artifacts/skull/laugh2.mp3',
  '/sounds/artifacts/skull/spooky1.mp3',
]

// Animation types
type AnimationType = 'right' | 'left' | 'updown' | 'spin' | null

interface SkullArtifactProps {
  position?: [number, number, number]
}

export default function SkullArtifact({ position = [0, 0, 0] }: SkullArtifactProps) {
  const groupRef = useRef<Group>(null)
  const glowRef = useRef<Mesh>(null)
  const leftEyeRef = useRef<Mesh>(null)
  const rightEyeRef = useRef<Mesh>(null)
  const jawRef = useRef<Mesh>(null)
  const teethRef = useRef<Mesh>(null)
  const jawLineRef = useRef<Mesh>(null)

  const [animation, setAnimation] = useState<AnimationType>(null)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [stars, setStars] = useState<StarParticle[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const starIdCounter = useRef(0)

  // Get camera for look-at behavior
  const { camera } = useThree()

  // Base floating motion
  const baseY = useRef(0)

  // Eye glow pulsing
  const eyeGlow = useRef(1)

  // Jaw animation for talking
  const jawAnimationTime = useRef(0)
  const isJawAnimating = useRef(false)
  const jawAnimationDuration = 1.5 // seconds of jaw movement

  // Create skull shader material with green wave effect
  const skullShaderMaterial = useMemo(() => {
    return new ShaderMaterial({
      vertexShader: skullVertexShader,
      fragmentShader: skullFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new Color('#f0f0f0') }, // Off-white bone color
        uWaveColor: { value: new Color('#00ff002a') }, // Green wave color
      },
    })
  }, [])

  // Spawn star particles
  const spawnStars = useCallback(() => {
    const newStars: StarParticle[] = []
    const numStars = 8 + Math.floor(Math.random() * 5)

    for (let i = 0; i < numStars; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 1.5 + Math.random() * 1.5

      const velocity = new Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      )

      newStars.push({
        id: starIdCounter.current++,
        position: new Vector3(0, 0, 0),
        velocity,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        scale: 0.5 + Math.random() * 0.5,
      })
    }

    setStars(prev => [...prev, ...newStars])
  }, [])

  // Animation loop
  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Update shader time for animated waves
    skullShaderMaterial.uniforms.uTime.value = state.clock.elapsedTime

    // Base floating animation (same as orb)
    baseY.current = Math.sin(state.clock.elapsedTime * 0.8) * 0.15

    // Eye glow pulsing
    eyeGlow.current = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.2

    // Update eye materials
    if (leftEyeRef.current && rightEyeRef.current) {
      const leftMat = leftEyeRef.current.material as any
      const rightMat = rightEyeRef.current.material as any
      if (leftMat.emissiveIntensity !== undefined) {
        leftMat.emissiveIntensity = eyeGlow.current * 2
        rightMat.emissiveIntensity = eyeGlow.current * 2
      }
    }

    // Jaw talking animation
    if (isJawAnimating.current) {
      jawAnimationTime.current += delta
      if (jawAnimationTime.current >= jawAnimationDuration) {
        // Animation complete - reset
        isJawAnimating.current = false
        jawAnimationTime.current = 0
        if (jawRef.current) jawRef.current.position.y = -0.4
        if (teethRef.current) teethRef.current.position.y = -0.28
        //if (jawLineRef.current) jawLineRef.current.position.y = -0.32
      } else {
        // Animate jaw up and down rapidly (like talking)
        const jawOffset = Math.sin(jawAnimationTime.current * 25) * 0.04
        if (jawRef.current) jawRef.current.position.y = -0.4 + jawOffset
        if (teethRef.current) teethRef.current.position.y = -0.28 + jawOffset
        //if (jawLineRef.current) jawLineRef.current.position.y = -0.32 + jawOffset
      }
    }

    // Handle click animations
    if (animation) {
      setAnimationProgress(prev => {
        const newProgress = prev + delta * 2
        if (newProgress >= 1) {
          setAnimation(null)
          return 0
        }
        return newProgress
      })

      const t = animationProgress
      const ease = Math.sin(t * Math.PI)

      switch (animation) {
        case 'right':
          groupRef.current.position.x = position[0] + ease * 0.4
          break
        case 'left':
          groupRef.current.position.x = position[0] + ease * -0.4
          break
        case 'updown':
          groupRef.current.position.y = position[1] + baseY.current + ease * 0.4
          break
        case 'spin':
          // Quick spin animation then return to facing camera
          groupRef.current.rotation.y += delta * 15
          groupRef.current.position.y = position[1] + baseY.current + ease * -0.1
          break
      }
    } else {
      // Default floating - face toward camera
      groupRef.current.position.x = position[0]
      groupRef.current.position.y = position[1] + baseY.current

      // Look at camera (only Y rotation to stay upright)
      const cameraPos = camera.position.clone()
      cameraPos.y = groupRef.current.position.y // Keep skull upright
      groupRef.current.lookAt(cameraPos)
    }

    // Sync glow position
    if (glowRef.current) {
      glowRef.current.position.y = groupRef.current.position.y
      glowRef.current.position.x = groupRef.current.position.x
    }

    // Update star particles
    if (stars.length > 0) {
      setStars(prevStars => {
        return prevStars
          .map(star => ({
            ...star,
            position: star.position.clone().add(star.velocity.clone().multiplyScalar(delta)),
            life: star.life + delta,
          }))
          .filter(star => star.life < star.maxLife)
      })
    }
  })

  const handleClick = (e: any) => {
    e.stopPropagation() // Prevent dagger from being thrown
    if (animation) return

    // Spawn star particles
    spawnStars()

    // Start jaw talking animation
    isJawAnimating.current = true
    jawAnimationTime.current = 0

    // Pick random animation
    const animations: AnimationType[] = ['right', 'left', 'updown', 'spin']
    const randomAnimation = animations[Math.floor(Math.random() * animations.length)]
    setAnimation(randomAnimation)
    setAnimationProgress(0)

    // Play random voiceline if available
    if (SKULL_VOICELINES.length > 0) {
      const randomVoiceline = SKULL_VOICELINES[Math.floor(Math.random() * SKULL_VOICELINES.length)]

      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      audioRef.current.src = randomVoiceline
      audioRef.current.currentTime = 0

      const volume = window.__getVolume?.('artifacts') ?? 1
      audioRef.current.volume = volume

      audioRef.current.play().catch(err => {
        console.warn('Could not play skull voiceline:', err)
      })
    }
  }

  return (
    <group position={position}>
      {/* Outer green glow */}
      <mesh ref={glowRef} scale={1.2}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial
          color="#00ff00"
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Skull group */}
      <group ref={groupRef} onClick={handleClick}>
        {/* Cranium - main skull shape (low poly) with animated shader */}
        <mesh castShadow position={[0, 0.15, 0]}>
          <sphereGeometry args={[0.55, 8, 6]} />
          <primitive object={skullShaderMaterial} attach="material" />
        </mesh>

        {/* Face/Cheekbone area with animated shader */}
        <mesh castShadow position={[0, -0.15, 0.2]}>
          <boxGeometry args={[0.5, 0.35, 0.4]} />
          <primitive object={skullShaderMaterial} attach="material" />
        </mesh>

        {/* Jaw with animated shader */}
        <mesh ref={jawRef} castShadow position={[0, -0.4, 0.15]}>
          <boxGeometry args={[0.35, 0.15, 0.55]} />
          <primitive object={skullShaderMaterial} attach="material" />
        </mesh>

        {/* Left eye socket (dark indent) */}
        <mesh position={[-0.15, 0.05, 0.4]}>
          <sphereGeometry args={[0.12, 6, 6]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>

        {/* Right eye socket (dark indent) */}
        <mesh position={[0.15, 0.05, 0.4]}>
          <sphereGeometry args={[0.12, 6, 6]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>

        {/* Left glowing eye */}
        <mesh ref={leftEyeRef} position={[-0.15, 0.05, 0.45]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color="#00ff00"
            emissive="#00ff00"
            emissiveIntensity={2}
          />
        </mesh>

        {/* Right glowing eye */}
        <mesh ref={rightEyeRef} position={[0.15, 0.05, 0.45]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color="#00ff00"
            emissive="#00ff00"
            emissiveIntensity={2}
          />
        </mesh>

        {/* Nose hole (black triangle pointing down) */}
        <mesh position={[0, -0.08, .47]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.08, 0.14, 3]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>

        {/* Teeth - simple row */}
        <mesh ref={teethRef} position={[0, -0.28, 0.35]}>
          <boxGeometry args={[0.25, 0.06, 0.08]} />
          <meshStandardMaterial
            color="#f8f8f8"
            roughness={0.6}
          />
        </mesh>

        {/* Black line between teeth and jaw */}
        <mesh ref={jawLineRef} position={[0, -0.32, 0.38]}>
          <boxGeometry args={[0.5, 0.02, 0.06]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>

      {/* Green eye lights */}
      <pointLight
        color="#00ff00"
        intensity={1.5}
        distance={3}
        position={[0, baseY.current, 0.5]}
      />

      {/* Star particles */}
      {stars.map(star => (
        <GreenStar
          key={star.id}
          position={star.position}
          opacity={1 - (star.life / star.maxLife)}
          scale={star.scale}
        />
      ))}

      {/* Instruction text */}
      <Text
        position={[0, -1.0, 0]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Chatter the Skull!
      </Text>
    </group>
  )
}
