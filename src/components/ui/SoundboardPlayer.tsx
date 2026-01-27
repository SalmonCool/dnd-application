/**
 * SoundboardPlayer Component
 * ==========================
 * Hidden YouTube player that plays soundboard effects for all players
 * Uses YouTube IFrame API like SpellSoundPlayer
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSoundPlayListener } from '../../hooks/useSoundboard'
import { database, ref, remove } from '../../config/firebase'
import type { YTPlayer } from '../../types/global'
import type { SoundPlayEvent } from '../../types/soundboard'

// Extract YouTube video ID from various URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Clear the current play event from Firebase
async function clearPlayEvent() {
  try {
    const playRef = ref(database, 'soundboard/currentPlay')
    await remove(playRef)
    console.log('🔊 Cleared soundboard play event from Firebase')
  } catch (err) {
    console.error('Error clearing soundboard play event:', err)
  }
}

export default function SoundboardPlayer() {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const lastEventRef = useRef<number>(0)
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize YouTube API
  useEffect(() => {
    const initializePlayer = () => {
      if (containerRef.current && !playerRef.current) {
        playerRef.current = new window.YT!.Player(containerRef.current, {
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: () => setIsReady(true),
            onStateChange: (event: { data: number }) => {
              // When video ends, wait 3 seconds then clear from Firebase
              if (event.data === window.YT!.PlayerState.ENDED) {
                // Clear any existing timeout
                if (clearTimeoutRef.current) {
                  clearTimeout(clearTimeoutRef.current)
                }
                // Set new timeout to clear after 3 seconds
                clearTimeoutRef.current = setTimeout(() => {
                  clearPlayEvent()
                }, 3000)
              }
            },
          },
        }) as unknown as YTPlayer
      }
    }

    // If API is already fully loaded, initialize directly
    if (window.YT && window.YT.Player) {
      initializePlayer()
      return
    }

    // Load the script if not already loading
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    // Chain callbacks instead of overwriting
    const existingCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      initializePlayer()
      // Call any previously registered callback
      if (existingCallback) existingCallback()
    }

    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current)
      }
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [])

  // Handle play events
  const handlePlay = useCallback((event: SoundPlayEvent) => {
    if (!isReady || !playerRef.current) return

    // Prevent playing the same event twice
    if (lastEventRef.current === event.playedAt) return
    lastEventRef.current = event.playedAt

    const videoId = extractVideoId(event.url)
    if (!videoId) {
      console.warn('Invalid YouTube URL for soundboard:', event.url)
      return
    }

    console.log(`🔊 Playing sound "${event.title}" by ${event.playedBy}`)

    try {
      // Set volume from settings before playing
      const volume = window.__getVolume?.('soundboard') ?? 1
      playerRef.current.setVolume(volume * 100)
      playerRef.current.loadVideoById(videoId)
      playerRef.current.playVideo()
    } catch (err) {
      console.error('Error playing soundboard sound:', err)
    }
  }, [isReady])

  useSoundPlayListener(handlePlay)

  return (
    <div className="soundboard-player" aria-hidden="true">
      <div ref={containerRef} />
    </div>
  )
}
