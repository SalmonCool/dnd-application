/**
 * PlaylistPanel Component
 * =======================
 * Slide-in panel from the right for YouTube playlist management
 * Uses YouTube IFrame API for playback control and auto-advance
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { FormEvent } from 'react'
import { usePlaylist } from '../../hooks/usePlaylist'

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          height: string
          width: string
          videoId: string
          playerVars?: Record<string, number>
          events?: {
            onReady?: (event: { target: YTPlayer }) => void
            onStateChange?: (event: { data: number; target: YTPlayer }) => void
            onError?: (event: { data: number }) => void
          }
        }
      ) => YTPlayer
      PlayerState: {
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady: () => void
  }
}

interface YTPlayer {
  loadVideoById: (videoId: string) => void
  playVideo: () => void
  pauseVideo: () => void
  destroy: () => void
}

interface PlaylistPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function PlaylistPanel({ isOpen, onClose }: PlaylistPanelProps) {
  const [inputUrl, setInputUrl] = useState('')
  const [inputTitle, setInputTitle] = useState('')
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)
  const [apiReady, setApiReady] = useState(false)

  const playerRef = useRef<YTPlayer | null>(null)

  const { items, loading, error, addItem, removeItem, moveItem, clearPlaylist, isValidYouTubeUrl } = usePlaylist()
  const [showClearModal, setShowClearModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
      /(?:youtu\.be\/)([^\?\s]+)/,
      /(?:youtube\.com\/embed\/)([^\?\s]+)/,
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return ''
  }

  // Extract playlist ID from YouTube playlist URL
  const extractPlaylistId = (url: string): string => {
    const match = url.match(/[?&]list=([^&\s]+)/)
    return match ? match[1] : ''
  }

  // Fetch video title using oEmbed (returns first 30 chars)
  const fetchVideoTitle = async (videoId: string): Promise<string> => {
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      )
      if (response.ok) {
        const data = await response.json()
        const title = data.title || 'Untitled'
        return title.length > 30 ? title.substring(0, 30) + '...' : title
      }
    } catch (err) {
      console.error('Error fetching video title:', err)
    }
    return 'Untitled'
  }

  // Import playlist handler
  const handleImportPlaylist = async () => {
    const playlistId = extractPlaylistId(importUrl)
    if (!playlistId) {
      setImportError('Invalid playlist URL. Please enter a valid YouTube playlist URL.')
      return
    }

    setImporting(true)
    setImportError(null)

    try {
      // Create a temporary player to load the playlist and get video IDs
      const tempDiv = document.createElement('div')
      tempDiv.id = 'temp-import-player'
      tempDiv.style.display = 'none'
      document.body.appendChild(tempDiv)

      const videoIds = await new Promise<string[]>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout loading playlist'))
        }, 15000)

        new window.YT.Player('temp-import-player', {
          height: '0',
          width: '0',
          playerVars: {
            listType: 'playlist',
            list: playlistId,
          },
          events: {
            onReady: (event: { target: any }) => {
              clearTimeout(timeout)
              // Small delay to let playlist load
              setTimeout(() => {
                const playlist = event.target.getPlaylist?.() || []
                resolve(playlist)
              }, 2000)
            },
            onError: () => {
              clearTimeout(timeout)
              reject(new Error('Failed to load playlist'))
            },
          },
        } satisfies YT.PlayerOptions )
      })

      // Cleanup temp player
      const tempPlayer = document.getElementById('temp-import-player')
      if (tempPlayer) tempPlayer.remove()

      if (videoIds.length === 0) {
        setImportError('No videos found in playlist or playlist is private.')
        setImporting(false)
        return
      }

      // Fetch titles and add each video
      for (const videoId of videoIds) {
        const title = await fetchVideoTitle(videoId)
        const url = `https://www.youtube.com/watch?v=${videoId}`
        await addItem(url, title, username)
      }

      setShowImportModal(false)
      setImportUrl('')
      console.log(`🎵 Imported ${videoIds.length} videos from playlist`)
    } catch (err) {
      console.error('Error importing playlist:', err)
      setImportError(err instanceof Error ? err.message : 'Failed to import playlist')
    } finally {
      setImporting(false)
      // Cleanup temp player if still exists
      const tempPlayer = document.getElementById('temp-import-player')
      if (tempPlayer) tempPlayer.remove()
    }
  }

  // Handle video ended - advance to next track
  const handleVideoEnded = useCallback(() => {
    console.log('🎵 Video ended, currentIndex:', currentIndex, 'items.length:', items.length)
    if (currentIndex !== null && currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // End of playlist, stop or loop back to beginning
      console.log('🎵 End of playlist')
    }
  }, [currentIndex, items.length])

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT) {
      setApiReady(true)
      return
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

    window.onYouTubeIframeAPIReady = () => {
      console.log('🎵 YouTube API Ready')
      setApiReady(true)
    }
  }, [])

  // Create/update player when currentIndex changes
  useEffect(() => {
    if (!apiReady || currentIndex === null || !items[currentIndex]) {
      return
    }

    const videoId = extractVideoId(items[currentIndex].url)
    if (!videoId) return

    // If player exists, just load new video
    if (playerRef.current) {
      console.log('🎵 Loading new video:', videoId)
      playerRef.current.loadVideoById(videoId)
      return
    }

    // Create new player
    console.log('🎵 Creating player for:', videoId)
    playerRef.current = new window.YT.Player('youtube-player', {
      height: '200',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (event) => {
          console.log('🎵 Player ready')
          event.target.playVideo()
        },
        onStateChange: (event) => {
          console.log('🎵 Player state changed:', event.data)
          // 0 = ended
          if (event.data === 0) {
            handleVideoEnded()
          }
        },
        onError: (event) => {
          console.error('🎵 Player error:', event.data)
        },
      },
    })
  }, [apiReady, currentIndex, items, handleVideoEnded])

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [])

  // Get username from localStorage (same as chat)
  const username = localStorage.getItem('dnd_chat_username') || 'Anonymous'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (inputUrl.trim() && isValidYouTubeUrl(inputUrl)) {
      await addItem(inputUrl.trim(), inputTitle.trim() || 'Untitled', username)
      setInputUrl('')
      setInputTitle('')
    }
  }

  // Select a track to play
  const handlePlay = (index: number) => {
    setCurrentIndex(index)
  }

  const handleRemove = async (itemId: string, index: number) => {
    await removeItem(itemId)
    // Adjust current index if needed
    if (currentIndex !== null) {
      if (index === currentIndex) {
        setCurrentIndex(null)
        // Destroy player when current track is removed
        if (playerRef.current) {
          playerRef.current.destroy()
          playerRef.current = null
        }
      } else if (index < currentIndex) {
        setCurrentIndex(currentIndex - 1)
      }
    }
  }

  const isUrlValid = inputUrl.trim() === '' || isValidYouTubeUrl(inputUrl)

  const handleClearPlaylist = async () => {
    await clearPlaylist()
    setCurrentIndex(null)
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }
    setShowClearModal(false)
  }

  return (
    <div className={`playlist-panel ${isOpen ? 'open' : ''}`}>
      <div className="playlist-header">
        <h2>Music Playlist</h2>
        <button className="close-button" onClick={onClose} title="Close playlist">
          ✕
        </button>
      </div>

      {/* YouTube Player */}
      <div className="playlist-player-container">
        {currentIndex !== null && items[currentIndex] ? (
          <div id="youtube-player" />
        ) : (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
            Select a track to play
          </div>
        )}
      </div>

      {/* Now Playing */}
      {currentIndex !== null && items[currentIndex] && (
        <div className="now-playing">
          <span className="now-playing-label">Now Playing</span>
          <span className="now-playing-title">{items[currentIndex].title}</span>
        </div>
      )}

      {/* Playlist Items */}
      <div className="playlist-items">
        {loading && <div className="playlist-status">Loading playlist...</div>}
        {error && <div className="playlist-error">Error: {error}</div>}
        {!loading && items.length === 0 && (
          <div className="playlist-status">No tracks yet. Add a YouTube URL below!</div>
        )}
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`playlist-item ${currentIndex === index ? 'playing' : ''}`}
          >
            <button
              className="play-button"
              onClick={() => handlePlay(index)}
              title={currentIndex === index ? 'Now playing' : 'Play'}
            >
              {currentIndex === index ? '🔊' : '▶'}
            </button>
            <div className="item-info">
              <span className="item-title">{item.title}</span>
              <span className="item-added">Added by {item.addedBy}</span>
            </div>
            <div className="item-reorder">
              <button
                className="reorder-button"
                onClick={() => moveItem(index, 'up')}
                disabled={index === 0}
                title="Move up"
              >
                ▲
              </button>
              <button
                className="reorder-button"
                onClick={() => moveItem(index, 'down')}
                disabled={index === items.length - 1}
                title="Move down"
              >
                ▼
              </button>
            </div>
            <button
              className="remove-button"
              onClick={() => handleRemove(item.id, index)}
              title="Remove from playlist"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Add Track Form */}
      <form className="add-track-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className={`url-input ${!isUrlValid ? 'invalid' : ''}`}
          placeholder="YouTube URL..."
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
        />
        {!isUrlValid && (
          <span className="url-error">Please enter a valid YouTube URL</span>
        )}
        <input
          type="text"
          className="title-input"
          placeholder="Title (optional)..."
          value={inputTitle}
          onChange={(e) => setInputTitle(e.target.value)}
        />
        <button
          type="submit"
          className="add-button"
          disabled={!inputUrl.trim() || !isUrlValid}
        >
          Add to Playlist
        </button>
        <button
          type="button"
          className="clear-playlist-button"
          onClick={() => setShowClearModal(true)}
          disabled={items.length === 0}
        >
          Clear Playlist
        </button>
        <button
          type="button"
          className="import-playlist-button"
          onClick={() => setShowImportModal(true)}
          disabled={!apiReady}
        >
          Import Playlist
        </button>
      </form>

      {/* Clear Playlist Confirmation Modal */}
      {showClearModal && (
        <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Clear Playlist?</h3>
            <p>Are you sure you want to remove all {items.length} track{items.length !== 1 ? 's' : ''} from the playlist?</p>
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={() => setShowClearModal(false)}>
                Cancel
              </button>
              <button className="modal-confirm" onClick={handleClearPlaylist}>
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Playlist Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => !importing && setShowImportModal(false)}>
          <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Import YouTube Playlist</h3>
            <p>Paste a YouTube playlist URL to import all videos.</p>
            <input
              type="text"
              className="import-url-input"
              placeholder="https://www.youtube.com/playlist?list=..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              disabled={importing}
            />
            {importError && (
              <span className="import-error">{importError}</span>
            )}
            {importing && (
              <div className="import-progress">
                Importing playlist... This may take a moment.
              </div>
            )}
            <div className="modal-buttons">
              <button
                className="modal-cancel"
                onClick={() => {
                  setShowImportModal(false)
                  setImportUrl('')
                  setImportError(null)
                }}
                disabled={importing}
              >
                Cancel
              </button>
              <button
                className="modal-confirm"
                onClick={handleImportPlaylist}
                disabled={!importUrl.trim() || importing}
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
