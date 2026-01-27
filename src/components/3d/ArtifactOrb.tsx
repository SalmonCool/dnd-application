/**
 * ArtifactOrb.tsx - Mystical Floating Orb Component
 * ==================================================
 * A dark blue orb with light blue glow and TV static texture.
 * Plays random animations and voicelines when clicked.
 */

import { useRef, useState, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, ShaderMaterial, Color, Vector3 } from 'three'
import { Text } from '@react-three/drei'

// Star particle interface
interface StarParticle {
  id: number
  position: Vector3
  velocity: Vector3
  life: number
  maxLife: number
  scale: number
}

// Star particle component
function Star({ position, opacity, scale }: { position: Vector3; opacity: number; scale: number }) {
  return (
    <mesh position={position} scale={scale}>
      {/* 4-pointed star using two crossed planes */}
      <group>
        <mesh rotation={[0, 0, 0]}>
          <planeGeometry args={[0.15, 0.04]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={opacity} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[0.15, 0.04]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={opacity} />
        </mesh>
        {/* Diagonal crosses for 8-pointed star effect */}
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.1, 0.03]} />
          <meshBasicMaterial color="#ffec8b" transparent opacity={opacity * 0.8} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <planeGeometry args={[0.1, 0.03]} />
          <meshBasicMaterial color="#ffec8b" transparent opacity={opacity * 0.8} />
        </mesh>
      </group>
    </mesh>
  )
}

// Voiceline paths - add your audio files to public/sounds/artifacts/
const VOICELINES = [
  '/sounds/artifacts/88.8.mp3',
  '/sounds/artifacts/ActionSurge.mp3',
  '/sounds/artifacts/BardSmooth.mp3',
  '/sounds/artifacts/BlueBaby.mp3',
  '/sounds/artifacts/CrazyFrog.mp3',
  '/sounds/artifacts/CatsOfFaerun.mp3',
  '/sounds/artifacts/Deadbeat.mp3',
  '/sounds/artifacts/DruidBear.mp3',
  '/sounds/artifacts/DebtKnee.mp3',
  '/sounds/artifacts/DabaDeeDabaDie.mp3',
  '/sounds/artifacts/Dragonborn.mp3',
  '/sounds/artifacts/DwarvesDumb.mp3',
  '/sounds/artifacts/EndlessScrying.mp3',
  '/sounds/artifacts/ErrandsForTheGreat.mp3',
  '/sounds/artifacts/Familiar.mp3',
  '/sounds/artifacts/GodLove.mp3',
  '/sounds/artifacts/GnomeViolin.mp3',
  '/sounds/artifacts/GroundBeef.mp3',
  '/sounds/artifacts/HelloHoney.mp3',
  '/sounds/artifacts/HogWarts.mp3',
  '/sounds/artifacts/Ko-bald.mp3',
  '/sounds/artifacts/MiddleEarth.mp3',
  '/sounds/artifacts/MusclesNoLove.mp3',
  '/sounds/artifacts/MontyPython.mp3',
  '/sounds/artifacts/Neat.mp3',
  '/sounds/artifacts/PhoneGuy.mp3',
  '/sounds/artifacts/PodCast.mp3',
  '/sounds/artifacts/RogueKeys.mp3',
  '/sounds/artifacts/Shaking.mp3',
  '/sounds/artifacts/ToBeKing.mp3',
  '/sounds/artifacts/WarlockInadequacy.mp3',
  '/sounds/artifacts/WizardDodge.mp3',
  '/sounds/artifacts/WizardNoBeard.mp3'
]

// Animation types
type AnimationType = 'right' | 'left' | 'updown' | 'spin' | null

// TV Static shader for the orb surface
const staticVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const staticFragmentShader = `
  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform vec3 uStaticColor;

  varying vec2 vUv;
  varying vec3 vNormal;

  // Random function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    // Animated TV static
    float staticNoise = random(vUv * 50.0 + uTime * 10.0);

    // Add some larger grain
    float grain = random(floor(vUv * 20.0) + floor(uTime * 30.0));

    // Mix static with base color
    float staticAmount = 0.3 + grain * 0.2;
    vec3 color = mix(uBaseColor, uStaticColor, staticNoise * staticAmount);

    // Add fresnel glow effect
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    color += vec3(0.3, 0.6, 1.0) * fresnel * 0.5;

    gl_FragColor = vec4(color, 1.0);
  }
`

interface ArtifactOrbProps {
  position?: [number, number, number]
}

export default function ArtifactOrb({ position = [0, 0, 0] }: ArtifactOrbProps) {
  const meshRef = useRef<Mesh>(null)
  const glowRef = useRef<Mesh>(null)
  const shaderRef = useRef<ShaderMaterial>(null)

  const [animation, setAnimation] = useState<AnimationType>(null)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [stars, setStars] = useState<StarParticle[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const starIdCounter = useRef(0)

  // Base floating motion
  const baseY = useRef(0)

  // Spawn star particles
  const spawnStars = useCallback(() => {
    const newStars: StarParticle[] = []
    const numStars = 8 + Math.floor(Math.random() * 5) // 8-12 stars

    for (let i = 0; i < numStars; i++) {
      // Random direction on a sphere
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
        maxLife: 0.6 + Math.random() * 0.4, // 0.6-1.0 seconds
        scale: 0.5 + Math.random() * 0.5,
      })
    }

    setStars(prev => [...prev, ...newStars])
  }, [])

  // Create shader material with uniforms
  const shaderMaterial = useMemo(() => {
    return new ShaderMaterial({
      vertexShader: staticVertexShader,
      fragmentShader: staticFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new Color('#0f356e') }, // Dark blue
        uStaticColor: { value: new Color('#4a9cee') }, // Light blue static
      },
    })
  }, [])

  // Animation loop
  useFrame((state, delta) => {
    if (!meshRef.current) return

    // Update shader time for TV static animation
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }

    // Base floating animation
    baseY.current = Math.sin(state.clock.elapsedTime * 0.8) * 0.15

    // Handle click animations
    if (animation) {
      setAnimationProgress(prev => {
        const newProgress = prev + delta * 2 // 0.5 second animation
        if (newProgress >= 1) {
          setAnimation(null)
          return 0
        }
        return newProgress
      })

      const t = animationProgress
      const ease = Math.sin(t * Math.PI) // Ease in-out

      switch (animation) {
        case 'right':
          meshRef.current.position.x = position[2] + ease * 0.4
          break
        case 'left':
        meshRef.current.position.x = position[2] + ease * -0.4
        break
        case 'updown':
          meshRef.current.position.y = position[1] + baseY.current + ease * 0.4
          break
        case 'spin':
          meshRef.current.rotation.y += delta * 15
          meshRef.current.position.y = position[1] + baseY.current
          meshRef.current.position.y = position[1] + baseY.current + ease * -0.1
          break
      }
    } else {
      // Default floating and slow rotation
      meshRef.current.position.y = position[1] + baseY.current
      meshRef.current.rotation.y += delta * 0.2
      meshRef.current.rotation.z = 0
    }

    // Sync glow position
    if (glowRef.current) {
      glowRef.current.position.y = meshRef.current.position.y
      glowRef.current.position.x = meshRef.current.position.x
      glowRef.current.rotation.copy(meshRef.current.rotation)
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

  const handleClick = () => {
    if (animation) return // Don't interrupt ongoing animation

    // Spawn star particles
    spawnStars()

    // Pick random animation
    const animations: AnimationType[] = ['right','left', 'updown', 'spin']
    const randomAnimation = animations[Math.floor(Math.random() * animations.length)]
    setAnimation(randomAnimation)
    setAnimationProgress(0)

    // Play random voiceline
    const randomVoiceline = VOICELINES[Math.floor(Math.random() * VOICELINES.length)]

    if (!audioRef.current) {
      audioRef.current = new Audio()
    }

    audioRef.current.src = randomVoiceline
    audioRef.current.currentTime = 0

    // Apply volume from settings
    const volume = window.__getVolume?.('artifacts') ?? 1
    audioRef.current.volume = volume

    audioRef.current.play().catch(err => {
      console.warn('Could not play voiceline:', err)
    })
  }

  return (
    <group position={position}>
      {/* Outer glow sphere */}
      <mesh ref={glowRef} scale={1.3}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial
          color="#2563eb"
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Main orb with TV static shader */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        castShadow
      >
        <sphereGeometry args={[0.8, 64, 64]} />
        <primitive object={shaderMaterial} ref={shaderRef} attach="material" />
      </mesh>

      {/* Inner glow */}
      <pointLight
        color="#60a5fa"
        intensity={2}
        distance={5}
        position={[0, baseY.current, 0]}
      />

      {/* Star particles */}
      {stars.map(star => (
        <Star
          key={star.id}
          position={star.position}
          opacity={1 - (star.life / star.maxLife)}
          scale={star.scale}
        />
      ))}

      {/* Instruction text */}
      <Text
        position={[0, -1.1, 0]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Click the orb
      </Text>
    </group>
  )
}
