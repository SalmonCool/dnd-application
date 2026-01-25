/**
 * SpellSoundPlayer Component
 * ==========================
 * Hidden YouTube player that plays spell sound effects for all players
 */

import { useEffect, useRef, useState } from 'react'
import { useSpellbook } from '../../hooks/useSpellbook'

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
  const playerRef = useRef<YT.Player | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const lastEventIdRef = useRef<string | null>(null)

  // Initialize YouTube API
  useEffect(() => {
    // Load YouTube IFrame API if not already loaded
    if (!(window as any).YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    // Set up the callback for when API is ready
    const onYouTubeIframeAPIReady = () => {
      if (containerRef.current && !playerRef.current) {
        playerRef.current = new (window as any).YT.Player(containerRef.current, {
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
            onStateChange: (event: YT.OnStateChangeEvent) => {
              // When video ends, clear the event
              if (event.data === (window as any).YT.PlayerState.ENDED) {
                clearSpellCastEvent()
              }
            },
          },
        })
      }
    }

    // Check if API is already loaded
    if ((window as any).YT && (window as any).YT.Player) {
      onYouTubeIframeAPIReady()
    } else {
      (window as any).onYouTubeIframeAPIReady = onYouTubeIframeAPIReady
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
