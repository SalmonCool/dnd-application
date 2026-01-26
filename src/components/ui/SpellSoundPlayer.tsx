/**
 * SpellSoundPlayer Component
 * ==========================
 * Hidden YouTube player that plays spell sound effects for all players
 */

import { useEffect, useRef, useState } from 'react'
import { useSpellbook } from '../../hooks/useSpellbook'
import type { YTPlayer } from '../../types/global'

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

export default function SpellSoundPlayer() {
  const { spellCastEvent, clearSpellCastEvent } = useSpellbook()
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const lastEventIdRef = useRef<string | null>(null)

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
              // When video ends, clear the event
              if (event.data === window.YT!.PlayerState.ENDED) {
                clearSpellCastEvent()
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
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [clearSpellCastEvent])

  // Play sound when a spell cast event is received
  useEffect(() => {
    if (!spellCastEvent || !isReady || !playerRef.current) return

    // Prevent playing the same event twice
    if (lastEventIdRef.current === `${spellCastEvent.id}-${spellCastEvent.timestamp}`) return
    lastEventIdRef.current = `${spellCastEvent.id}-${spellCastEvent.timestamp}`

    const videoId = extractVideoId(spellCastEvent.soundUrl)
    if (!videoId) {
      console.warn('Invalid YouTube URL for spell sound:', spellCastEvent.soundUrl)
      return
    }

    console.log(`Playing spell sound for "${spellCastEvent.spellName}" cast by ${spellCastEvent.castBy}`)

    try {
      // Set volume from settings before playing
      const volume = window.__getVolume?.('spells') ?? 1
      playerRef.current.setVolume(volume * 100)
      playerRef.current.loadVideoById(videoId)
      playerRef.current.playVideo()
    } catch (err) {
      console.error('Error playing spell sound:', err)
    }
  }, [spellCastEvent, isReady])

  return (
    <div className="spell-sound-player" aria-hidden="true">
      <div ref={containerRef} />
    </div>
  )
}
