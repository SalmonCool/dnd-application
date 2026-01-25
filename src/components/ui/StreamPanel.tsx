/**
 * StreamPanel Component
 * =====================
 * Fullscreen slide-in panel for displaying screen share stream
 */

import { useEffect, useRef } from 'react'
import type { StreamState } from '../../types/stream'

interface StreamPanelProps {
  isOpen: boolean
  isStreaming: boolean
  isViewing: boolean
  activeStream: StreamState | null
  onClose: () => void
  onStopStream: () => void
  onJoinAsViewer: () => void
  attachVideo: (videoElement: HTMLVideoElement | null) => void
  error?: string | null
}

export default function StreamPanel({
  isOpen,
  isStreaming,
  isViewing,
  activeStream,
  onClose,
  onStopStream,
  onJoinAsViewer,
  attachVideo,
  error,
}: StreamPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Attach video element when component mounts or streaming/viewing starts
  useEffect(() => {
    if (videoRef.current && (isStreaming || isViewing)) {
      attachVideo(videoRef.current)
    }
  }, [isStreaming, isViewing, attachVideo])

  // Auto-play when stream starts
  useEffect(() => {
    if (videoRef.current && (isStreaming || isViewing)) {
      videoRef.current.play().catch((err) => {
        console.error('Error auto-playing video:', err)
      })
    }
  }, [isStreaming, isViewing])

  // Update video volume when volume settings change
  useEffect(() => {
    const updateVolume = () => {
      if (videoRef.current && isViewing) {
        const volume = window.__getVolume?.('stream') ?? 1
        videoRef.current.volume = volume
      }
    }

    // Set initial volume and poll for changes
    updateVolume()
    const interval = setInterval(updateVolume, 500)
    return () => clearInterval(interval)
  }, [isViewing])

  const getStatusMessage = () => {
    if (error) return null
    if (isStreaming) return 'You are sharing your screen'
    if (isViewing) return `Watching ${activeStream?.streamerName || 'stream'}...`
    if (activeStream && activeStream.active) {
      return `${activeStream.streamerName} is sharing their screen`
    }
    return 'No active stream'
  }

  const statusMessage = getStatusMessage()

  return (
    <div className={`stream-panel ${isOpen ? 'open' : ''}`}>
      <div className="stream-header">
        <h2>Screen Share</h2>
        <button className="close-button" onClick={onClose} title="Close stream">
          ✕
        </button>
      </div>

      <div className="stream-content">
        {error && <div className="stream-error">{error}</div>}

        {!error && statusMessage && !isStreaming && !isViewing && (
          <div className="stream-status">
            {statusMessage}
            {activeStream && activeStream.active && (
              <button
                className="join-viewer-button"
                onClick={onJoinAsViewer}
              >
                Watch Stream
              </button>
            )}
          </div>
        )}

        {(isStreaming || isViewing) && (
          <div className="stream-video-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isStreaming}
              controls
              className="stream-video"
            />
            {statusMessage && (
              <div className="stream-status-overlay">{statusMessage}</div>
            )}
          </div>
        )}
      </div>

      {isStreaming && (
        <div className="stream-controls">
          <button className="stop-stream-button" onClick={onStopStream}>
            Stop Streaming
          </button>
        </div>
      )}
    </div>
  )
}
