/**
 * useStream Hook
 * ==============
 * Custom hook for WebRTC screen sharing with Firebase signaling (Mesh Topology)
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { database, ref, set, onValue, off, push, remove } from '../config/firebase'
import type { StreamState, SignalData } from '../types/stream'

// Debug logging - set VITE_DEBUG_WEBRTC=true in .env to enable
const DEBUG_WEBRTC = import.meta.env.VITE_DEBUG_WEBRTC === 'true'

// Debug logger helper - only logs when DEBUG_WEBRTC is true
const debugLog = (message: string, ...args: any[]) => {
  if (DEBUG_WEBRTC) {
    console.log(message, ...args)
  }
}

const debugWarn = (message: string, ...args: any[]) => {
  if (DEBUG_WEBRTC) {
    console.warn(message, ...args)
  }
}

const debugError = (message: string, ...args: any[]) => {
  if (DEBUG_WEBRTC) {
    console.error(message, ...args)
  }
}

const STREAM_STATE_PATH = 'streamState'
const SIGNALING_PATH = 'signaling'
const USERNAME_KEY = 'dnd_chat_username'

// WebRTC configuration
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

// Reconnection configuration
const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_DELAY_MS = 2000 // Start with 2 seconds
const RECONNECT_BACKOFF_MULTIPLIER = 1.5 // Exponential backoff

export function useStream() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isViewing, setIsViewing] = useState(false)
  const [activeStream, setActiveStream] = useState<StreamState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)

  const localStreamRef = useRef<MediaStream | null>(null)
  // Map of peer connections: viewerId -> RTCPeerConnection
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const viewerPeerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const userIdRef = useRef<string>(localStorage.getItem(USERNAME_KEY) || `user_${Date.now()}`)
  // Track processed signals to avoid duplicates
  const processedSignalsRef = useRef<Set<string>>(new Set())
  // Queue for ICE candidates that arrive before remote description is set
  // Key is peerId, value is array of candidates
  const iceCandidateQueueRef = useRef<Map<string, RTCIceCandidate[]>>(new Map())
  // Reconnection timer reference
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  // Track the streamer ID we're connected to (for reconnection)
  const connectedStreamerIdRef = useRef<string | null>(null)

  /**
   * Listen for active streams
   */
  useEffect(() => {
    const streamStateRef = ref(database, STREAM_STATE_PATH)

    const unsubscribe = onValue(streamStateRef, (snapshot) => {
      const data = snapshot.val()
      if (data && data.active) {
        setActiveStream(data as StreamState)
      } else {
        setActiveStream(null)
      }
    })

    return () => {
      off(streamStateRef)
    }
  }, [])

  /**
   * Listen for WebRTC signaling messages
   */
  useEffect(() => {
    const signalingRef = ref(database, SIGNALING_PATH)

    const unsubscribe = onValue(signalingRef, async (snapshot) => {
      const data = snapshot.val()
      if (!data) return

      // Process all signaling messages
      for (const key in data) {
        // Skip if already processed
        if (processedSignalsRef.current.has(key)) continue

        const signal: SignalData = data[key]

        // Debug: Log all incoming signals
        if (signal.type === 'ice-candidate') {
          debugLog('🔍 ICE Signal received:', {
            type: signal.type,
            from: signal.from,
            to: signal.to,
            myId: userIdRef.current,
            isFromSelf: signal.from === userIdRef.current,
            isForMe: !signal.to || signal.to === userIdRef.current,
            isStreaming,
            isViewing
          })
        }

        // Skip messages from self
        if (signal.from === userIdRef.current) {
          if (signal.type === 'ice-candidate') {
            debugLog('🔍 Skipping ICE - from self')
          }
          continue
        }

        // Skip messages not meant for this user (if targeted)
        if (signal.to && signal.to !== userIdRef.current) {
          if (signal.type === 'ice-candidate') {
            debugLog('🔍 Skipping ICE - not for me. to:', signal.to, 'myId:', userIdRef.current)
          }
          continue
        }

        // Mark as processed
        processedSignalsRef.current.add(key)

        if (signal.type === 'ice-candidate') {
          debugLog('🔍 Processing ICE candidate from:', signal.from)
        }

        try {
          if (signal.type === 'join-request' && isStreaming) {
            // Viewer wants to join, create peer connection and send offer
            await handleViewerJoinRequest(signal.from)
          } else if (signal.type === 'offer' && isViewing) {
            // Streamer sent offer to this viewer
            await handleOffer(signal)
          } else if (signal.type === 'answer' && isStreaming) {
            // Viewer sent answer back
            await handleAnswer(signal)
          } else if (signal.type === 'ice-candidate') {
            // ICE candidate from either side
            await handleIceCandidate(signal)
          }

          // Clean up processed signal after a short delay
          setTimeout(async () => {
            const signalRef = ref(database, `${SIGNALING_PATH}/${key}`)
            await remove(signalRef)
            // Also remove from processed set after cleanup
            setTimeout(() => {
              processedSignalsRef.current.delete(key)
            }, 1000)
          }, 1000)
        } catch (err) {
          debugError('Error processing signal:', err)
          // Remove from processed set on error so it can be retried
          processedSignalsRef.current.delete(key)
        }
      }
    })

    return () => {
      off(signalingRef)
    }
  }, [isStreaming, isViewing])

  /**
   * Handle viewer join request (streamer side)
   */
  const handleViewerJoinRequest = async (viewerId: string) => {
    try {
      debugLog(`📥 Viewer join request from: ${viewerId}`)
      debugLog('📹 Local stream exists:', !!localStreamRef.current)

      if (localStreamRef.current) {
        debugLog('📊 Local stream tracks:', localStreamRef.current.getTracks().map(t => ({
          kind: t.kind,
          id: t.id,
          enabled: t.enabled,
          readyState: t.readyState
        })))
      }

      // Create new peer connection for this viewer
      const pc = createPeerConnection(viewerId, true)
      peerConnectionsRef.current.set(viewerId, pc)

      // Add local stream tracks to this peer connection
      if (localStreamRef.current) {
        const tracks = localStreamRef.current.getTracks()
        debugLog(`➕ Adding ${tracks.length} tracks to peer connection`)

        tracks.forEach((track) => {
          const sender = pc.addTrack(track, localStreamRef.current!)
          debugLog(`✅ Added track: ${track.kind} (id: ${track.id})`, sender)
        })
      } else {
        debugError('❌ No local stream available!')
      }

      // Create and send offer to this specific viewer
      debugLog('🔧 Creating offer...')
      const offer = await pc.createOffer()
      debugLog('📋 Offer created:', offer)
      debugLog('📋 Offer SDP:', offer.sdp)

      // Check if tracks are in the SDP
      const hasVideo = offer.sdp?.includes('m=video')
      const hasAudio = offer.sdp?.includes('m=audio')
      debugLog('🔍 SDP includes video:', hasVideo)
      debugLog('🔍 SDP includes audio:', hasAudio)

      await pc.setLocalDescription(offer)
      debugLog('✅ Local description set')
      debugLog('📊 Peer connection state after setting local desc:', {
        signalingState: pc.signalingState,
        iceConnectionState: pc.iceConnectionState,
        connectionState: pc.connectionState
      })

      await sendSignal({
        type: 'offer',
        from: userIdRef.current,
        to: viewerId,
        data: offer,
        timestamp: Date.now(),
      })

      debugLog(`✅ Sent offer to viewer: ${viewerId}`)
    } catch (err) {
      debugError('❌ Error handling viewer join:', err)
    }
  }

  /**
   * Handle incoming offer (viewer side)
   */
  const handleOffer = async (signal: SignalData) => {
    try {
      debugLog('📥 Received offer from streamer', signal.from)
      debugLog('📋 Current viewer ID:', userIdRef.current)

      if (!viewerPeerConnectionRef.current) {
        debugLog('🔧 Creating new peer connection for viewer')
        viewerPeerConnectionRef.current = createPeerConnection(signal.from, false)
      }

      const pc = viewerPeerConnectionRef.current

      // Check current signaling state
      debugLog('📊 Current signaling state:', pc.signalingState)

      // Only process offer if we're in the right state
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
        debugWarn('⚠️ Ignoring offer, wrong state:', pc.signalingState)
        return
      }

      debugLog('🔄 Setting remote description (offer)')
      debugLog('📋 Received offer SDP:', signal.data.sdp)

      // Check what's in the received offer
      const hasVideo = signal.data.sdp?.includes('m=video')
      const hasAudio = signal.data.sdp?.includes('m=audio')
      debugLog('🔍 Received offer includes video:', hasVideo)
      debugLog('🔍 Received offer includes audio:', hasAudio)

      // CRITICAL: Ensure ontrack handler is attached before setting remote description
      // Re-attach it here to be absolutely sure
      debugLog('🎯 Setting up ontrack handler')
      pc.ontrack = (event) => {
        debugLog('🎥 Received remote track!', {
          kind: event.track.kind,
          id: event.track.id,
          readyState: event.track.readyState,
          muted: event.track.muted,
          enabled: event.track.enabled,
          streams: event.streams.length
        })

        if (event.streams[0]) {
          const stream = event.streams[0]
          debugLog('📺 Setting video srcObject to stream:', {
            id: stream.id,
            active: stream.active,
            tracks: stream.getTracks().map(t => ({
              kind: t.kind,
              id: t.id,
              enabled: t.enabled,
              readyState: t.readyState
            }))
          })

          if (videoRef.current) {
            videoRef.current.srcObject = stream
            debugLog('✅ Video srcObject set')
            videoRef.current.play().catch((err) => {
              debugError('❌ Error playing video:', err)
            })
          } else {
            debugError('❌ Video element not available!')
          }
        } else {
          debugError('❌ No stream in track event!')
        }
      }
      debugLog('✅ ontrack handler attached')

      await pc.setRemoteDescription(new RTCSessionDescription(signal.data))
      debugLog('✅ Remote description set')
      debugLog('📊 Peer connection state after setting remote desc:', {
        signalingState: pc.signalingState,
        iceConnectionState: pc.iceConnectionState,
        connectionState: pc.connectionState,
        remoteDescription: !!pc.remoteDescription
      })

      // Flush any ICE candidates that arrived before remote description was set
      await flushIceCandidates(pc, signal.from)

      // Check transceivers after setting remote description
      const transceiversAfter = pc.getTransceivers()
      debugLog(`📡 Transceivers after setting remote description: ${transceiversAfter.length}`)
      transceiversAfter.forEach((transceiver, index) => {
        debugLog(`  Transceiver ${index}:`, {
          mid: transceiver.mid,
          direction: transceiver.direction,
          currentDirection: transceiver.currentDirection,
          receiver: {
            track: transceiver.receiver.track ? {
              kind: transceiver.receiver.track.kind,
              id: transceiver.receiver.track.id,
              enabled: transceiver.receiver.track.enabled,
              readyState: transceiver.receiver.track.readyState,
              muted: transceiver.receiver.track.muted
            } : null
          }
        })
      })

      debugLog('🔧 Creating answer')
      const answer = await pc.createAnswer()
      debugLog('📋 Answer SDP:', answer.sdp)
      await pc.setLocalDescription(answer)
      debugLog('✅ Local description set (answer)')
      debugLog('📊 Peer connection state after answer:', {
        signalingState: pc.signalingState,
        iceConnectionState: pc.iceConnectionState,
        connectionState: pc.connectionState
      })

      // Check receivers (what we expect to receive)
      const receivers = pc.getReceivers()
      debugLog(`📥 Peer connection has ${receivers.length} receivers:`, receivers.map(r => ({
        track: r.track ? {
          kind: r.track.kind,
          id: r.track.id,
          enabled: r.track.enabled,
          readyState: r.track.readyState
        } : null
      })))

      // Send answer back to streamer
      await sendSignal({
        type: 'answer',
        from: userIdRef.current,
        to: signal.from,
        data: answer,
        timestamp: Date.now(),
      })

      debugLog('✅ Sent answer to streamer')
    } catch (err) {
      debugError('❌ Error handling offer:', err)
      if (err instanceof Error) {
        debugError('Error details:', err.message, err.name)
        setError(`Failed to connect: ${err.message}`)
      } else {
        setError('Failed to connect to stream')
      }
    }
  }

  /**
   * Handle incoming answer (streamer side)
   */
  const handleAnswer = async (signal: SignalData) => {
    try {
      debugLog(`📥 Received answer from viewer: ${signal.from}`)

      const pc = peerConnectionsRef.current.get(signal.from)
      if (!pc) {
        debugWarn(`❌ No peer connection found for viewer: ${signal.from}`)
        return
      }

      debugLog('📋 Answer SDP:', signal.data.sdp)
      debugLog('📊 PC state before setting answer:', {
        signalingState: pc.signalingState,
        iceConnectionState: pc.iceConnectionState,
        connectionState: pc.connectionState
      })

      await pc.setRemoteDescription(new RTCSessionDescription(signal.data))
      debugLog(`✅ Set remote description for viewer: ${signal.from}`)

      // Flush any ICE candidates that arrived before remote description was set
      await flushIceCandidates(pc, signal.from)

      // Check senders after answer is set
      const senders = pc.getSenders()
      debugLog(`📤 Peer connection has ${senders.length} senders:`, senders.map(s => ({
        track: s.track ? {
          kind: s.track.kind,
          id: s.track.id,
          enabled: s.track.enabled,
          readyState: s.track.readyState
        } : null
      })))

      debugLog('📊 PC state after setting answer:', {
        signalingState: pc.signalingState,
        iceConnectionState: pc.iceConnectionState,
        connectionState: pc.connectionState
      })
    } catch (err) {
      debugError('❌ Error handling answer:', err)
    }
  }

  /**
   * Flush queued ICE candidates for a peer after remote description is set
   */
  const flushIceCandidates = async (pc: RTCPeerConnection, peerId: string) => {
    const queue = iceCandidateQueueRef.current.get(peerId)
    if (!queue || queue.length === 0) {
      return
    }

    debugLog(`🧊 Flushing ${queue.length} queued ICE candidates for ${peerId}`)

    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(candidate)
        debugLog(`✅ Added queued ICE candidate for ${peerId}`)
      } catch (err) {
        debugError(`❌ Error adding queued ICE candidate:`, err)
      }
    }

    // Clear the queue
    iceCandidateQueueRef.current.delete(peerId)
  }

  /**
   * Handle ICE candidate
   */
  const handleIceCandidate = async (signal: SignalData) => {
    try {
      debugLog('🔍 handleIceCandidate called:', {
        isStreaming,
        isViewing,
        signalFrom: signal.from,
        hasViewerPeerConnection: !!viewerPeerConnectionRef.current,
        streamerPeerConnectionCount: peerConnectionsRef.current.size,
        streamerPeerConnectionKeys: Array.from(peerConnectionsRef.current.keys()),
        signalData: signal.data,
        hasCandidate: !!signal.data?.candidate
      })

      // Ignore null candidates (ICE gathering complete)
      if (!signal.data || !signal.data.candidate) {
        debugLog('🏁 Received remote ICE gathering complete signal (no candidate in data)')
        return
      }

      debugLog('🔍 ICE candidate data exists, continuing...')

      let pc: RTCPeerConnection | null = null
      let direction = ''
      const peerId = signal.from

      if (isStreaming) {
        // Streamer receiving ICE from viewer
        pc = peerConnectionsRef.current.get(peerId) || null
        direction = `from viewer ${peerId}`
        debugLog(`🧊 Streamer receiving ICE ${direction}`, {
          foundPc: !!pc,
          lookingFor: peerId,
          availableKeys: Array.from(peerConnectionsRef.current.keys())
        })
      } else if (isViewing) {
        // Viewer receiving ICE from streamer
        pc = viewerPeerConnectionRef.current
        direction = `from streamer ${peerId}`
        debugLog(`🧊 Viewer receiving ICE ${direction}`, { foundPc: !!pc })
      } else {
        debugError('❌ Neither isStreaming nor isViewing is true!')
      }

      if (!pc) {
        debugWarn('⚠️ No peer connection for ICE candidate', {
          isStreaming,
          isViewing,
          peerId,
          viewerPc: !!viewerPeerConnectionRef.current,
          streamerPcs: Array.from(peerConnectionsRef.current.keys())
        })
        return
      }

      const candidate = new RTCIceCandidate(signal.data)

      debugLog('📋 ICE candidate details:', {
        type: signal.data.type,
        protocol: signal.data.protocol,
        address: signal.data.address,
        port: signal.data.port
      })

      // Check if remote description is set before adding ICE candidate
      if (!pc.remoteDescription) {
        debugLog(`📦 Queueing ICE candidate ${direction} (remote description not set yet)`)

        // Add to queue
        const queue = iceCandidateQueueRef.current.get(peerId) || []
        queue.push(candidate)
        iceCandidateQueueRef.current.set(peerId, queue)

        debugLog(`📦 Queue size for ${peerId}: ${queue.length}`)
        return
      }

      await pc.addIceCandidate(candidate)
      debugLog(`✅ Added ICE candidate ${direction}`)
      debugLog('📊 Peer connection state after adding ICE:', {
        iceConnectionState: pc.iceConnectionState,
        connectionState: pc.connectionState
      })
    } catch (err) {
      debugError('❌ Error handling ICE candidate:', err)
    }
  }

  /**
   * Create RTCPeerConnection
   */
  const createPeerConnection = (peerId: string, isStreamer: boolean): RTCPeerConnection => {
    debugLog(`🔧 Creating peer connection for ${isStreamer ? 'viewer' : 'streamer'}: ${peerId}`)
    const pc = new RTCPeerConnection(ICE_SERVERS)

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        debugLog('🧊 Local ICE candidate generated:', {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port,
          candidate: event.candidate.candidate.substring(0, 80)
        })
        // IMPORTANT: Use toJSON() to serialize RTCIceCandidate for Firebase
        // RTCIceCandidate objects don't serialize to JSON automatically
        sendSignal({
          type: 'ice-candidate',
          from: userIdRef.current,
          to: peerId,
          data: event.candidate.toJSON(),
          timestamp: Date.now(),
        })
      } else {
        debugLog('🏁 ICE gathering complete')
        // Diagnostic dump when ICE gathering completes
        debugLog('🔍 ========== ICE GATHERING COMPLETE DIAGNOSTICS ==========')
        debugLog('📊 Peer Connection State:', {
          iceConnectionState: pc.iceConnectionState,
          iceGatheringState: pc.iceGatheringState,
          connectionState: pc.connectionState,
          signalingState: pc.signalingState
        })
        debugLog('📤 Senders:', pc.getSenders().map(s => ({
          track: s.track ? { kind: s.track.kind, id: s.track.id, readyState: s.track.readyState } : null
        })))
        debugLog('📥 Receivers:', pc.getReceivers().map(r => ({
          track: r.track ? { kind: r.track.kind, id: r.track.id, readyState: r.track.readyState, muted: r.track.muted } : null
        })))
        debugLog('📡 Transceivers:', pc.getTransceivers().map(t => ({
          mid: t.mid,
          direction: t.direction,
          currentDirection: t.currentDirection,
          sender: t.sender.track ? t.sender.track.kind : null,
          receiver: t.receiver.track ? t.receiver.track.kind : null
        })))
        debugLog('🔍 ========== END DIAGNOSTICS ==========')
      }
    }

    pc.onicegatheringstatechange = () => {
      debugLog(`❄️ ICE gathering state (${peerId}):`, pc.iceGatheringState)

      // When gathering completes, do a full diagnostic
      if (pc.iceGatheringState === 'complete' && !isStreamer) {
        debugLog('🔍 Viewer: ICE gathering complete - checking track status...')
        const receivers = pc.getReceivers()
        const videoReceiver = receivers.find(r => r.track?.kind === 'video')
        const audioReceiver = receivers.find(r => r.track?.kind === 'audio')

        if (!videoReceiver?.track) {
          debugError('❌ No video track in receivers after ICE gathering complete!')
          debugError('💡 Possible causes:')
          debugError('   1. Streamer did not add video track to peer connection')
          debugError('   2. SDP negotiation failed to include video')
          debugError('   3. Track was added but with wrong direction')
        } else {
          debugLog('✅ Video receiver track exists:', {
            id: videoReceiver.track.id,
            readyState: videoReceiver.track.readyState,
            muted: videoReceiver.track.muted,
            enabled: videoReceiver.track.enabled
          })

          // Check if track is receiving data
          if (videoReceiver.track.muted) {
            debugWarn('⚠️ Video track is MUTED - media may not be flowing')
          }
        }

        if (audioReceiver?.track) {
          debugLog('🔊 Audio receiver track:', {
            id: audioReceiver.track.id,
            readyState: audioReceiver.track.readyState,
            muted: audioReceiver.track.muted
          })
        }
      }
    }

    pc.onicecandidateerror = (event) => {
      debugError(`❌ ICE candidate error (${peerId}):`, {
        errorCode: event.errorCode,
        errorText: event.errorText,
        url: event.url,
        address: event.address,
        port: event.port
      })
    }

    pc.onsignalingstatechange = () => {
      debugLog(`📡 Signaling state changed (${peerId}):`, pc.signalingState)
    }

    pc.onconnectionstatechange = () => {
      debugLog(`🔌 Connection state changed (${peerId}):`, pc.connectionState)
    }

    if (!isStreamer) {
      // Track if we've already set up the video to avoid duplicate play() calls
      let videoSetupComplete = false

      // Viewer side: receive remote stream
      pc.ontrack = (event) => {
        debugLog('🎥 ========== RECEIVED REMOTE TRACK ==========')
        debugLog('🎥 Track details:', {
          kind: event.track.kind,
          id: event.track.id,
          label: event.track.label,
          readyState: event.track.readyState,
          muted: event.track.muted,
          enabled: event.track.enabled,
          contentHint: event.track.contentHint,
          streams: event.streams.length
        })

        // Listen to track events for debugging
        event.track.onmute = () => debugWarn(`⚠️ Track ${event.track.kind} muted`)
        event.track.onunmute = () => debugLog(`✅ Track ${event.track.kind} unmuted`)
        event.track.onended = () => debugError(`❌ Track ${event.track.kind} ended`)

        if (event.streams[0]) {
          const stream = event.streams[0]
          debugLog('📺 Stream details:', {
            id: stream.id,
            active: stream.active,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
            tracks: stream.getTracks().map(t => ({
              kind: t.kind,
              id: t.id,
              label: t.label,
              enabled: t.enabled,
              readyState: t.readyState,
              muted: t.muted
            }))
          })

          // Check for video tracks specifically
          const videoTracks = stream.getVideoTracks()
          if (videoTracks.length === 0) {
            debugError('❌ NO VIDEO TRACKS in stream! Only audio?')
          } else {
            debugLog('✅ Video track found:', {
              label: videoTracks[0].label,
              enabled: videoTracks[0].enabled,
              muted: videoTracks[0].muted,
              readyState: videoTracks[0].readyState,
              settings: videoTracks[0].getSettings?.() || 'N/A'
            })
          }

          if (videoRef.current) {
            const video = videoRef.current

            // Check if we already set up this stream (ontrack fires for each track)
            if (video.srcObject === stream) {
              debugLog('📹 Stream already attached, skipping duplicate setup')
              debugLog('🎥 ========== END TRACK HANDLER (skipped) ==========')
              return
            }

            // Only set up video element listeners once
            if (!videoSetupComplete) {
              video.onloadstart = () => debugLog('📹 Video: loadstart')
              video.onloadedmetadata = () => {
                debugLog('📹 Video: loadedmetadata', {
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight,
                  duration: video.duration
                })
              }
              video.onloadeddata = () => debugLog('📹 Video: loadeddata')
              video.oncanplay = () => debugLog('📹 Video: canplay')
              video.oncanplaythrough = () => debugLog('📹 Video: canplaythrough')
              video.onplay = () => debugLog('📹 Video: play')
              video.onplaying = () => debugLog('📹 Video: playing')
              video.onwaiting = () => debugWarn('📹 Video: waiting (buffering)')
              video.onstalled = () => debugWarn('📹 Video: stalled')
              video.onerror = (e) => debugError('📹 Video: error', e, video.error)
              video.onsuspend = () => debugLog('📹 Video: suspend')
              video.onemptied = () => debugWarn('📹 Video: emptied')
            }

            // Set srcObject
            video.srcObject = stream
            videoSetupComplete = true
            debugLog('✅ Video srcObject set')

            // Log video element state
            debugLog('📹 Video element state:', {
              srcObject: !!video.srcObject,
              readyState: video.readyState,
              paused: video.paused,
              ended: video.ended,
              muted: video.muted,
              autoplay: video.autoplay,
              playsInline: video.playsInline,
              width: video.width,
              height: video.height,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight
            })

            // Try to play with detailed error handling
            video.play()
              .then(() => {
                debugLog('✅ Video playing successfully')
                // Check video dimensions after play
                setTimeout(() => {
                  debugLog('📹 Video dimensions after play:', {
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight,
                    clientWidth: video.clientWidth,
                    clientHeight: video.clientHeight,
                    paused: video.paused,
                    currentTime: video.currentTime
                  })
                }, 1000)
              })
              .catch((err) => {
                debugError('❌ Error playing video:', err.name, err.message)
                if (err.name === 'NotAllowedError') {
                  debugError('💡 Autoplay blocked - user interaction required')
                  setError('Click to enable video playback')
                } else if (err.name === 'AbortError') {
                  debugError('💡 Play was aborted - possibly interrupted by another operation')
                }
              })
          } else {
            debugError('❌ Video element not available!')
            debugError('💡 videoRef.current is null - is the video element mounted?')
          }
        } else {
          debugError('❌ No stream in track event!')
          debugLog('💡 This usually means tracks were added without an associated stream')
          debugLog('💡 Attempting to create stream from track directly...')

          // Try to create a stream from the track directly
          if (videoRef.current && event.track.kind === 'video') {
            const stream = new MediaStream([event.track])
            videoRef.current.srcObject = stream
            debugLog('✅ Created stream from track directly')
            videoRef.current.play().catch(err => {
              debugError('❌ Error playing video from direct track:', err)
            })
          }
        }
        debugLog('🎥 ========== END TRACK HANDLER ==========')
      }
    }

    pc.oniceconnectionstatechange = () => {
      debugLog(`🔌 ICE connection state (${peerId}):`, pc.iceConnectionState, {
        connectionState: pc.connectionState,
        signalingState: pc.signalingState,
        iceGatheringState: pc.iceGatheringState
      })

      if (pc.iceConnectionState === 'checking') {
        debugLog('🔍 ICE checking - testing connectivity...')
      } else if (pc.iceConnectionState === 'disconnected') {
        // Disconnected state might recover on its own, wait a bit before reconnecting
        debugWarn(`⚠️ ICE connection disconnected (${peerId}) - may recover...`)

        if (!isStreamer) {
          setError('Connection unstable, attempting to recover...')

          // Wait 3 seconds to see if it recovers before attempting reconnect
          reconnectTimerRef.current = setTimeout(() => {
            // Check if still disconnected
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
              debugLog('🔄 Connection did not recover, attempting reconnect...')
              attemptReconnect(1)
            }
          }, 3000)
        }

        // Clean up disconnected viewer (if streamer)
        if (isStreamer) {
          // Give it a moment to potentially recover before cleanup
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
              debugLog(`🧹 Cleaning up disconnected viewer: ${peerId}`)
              peerConnectionsRef.current.delete(peerId)
              pc.close()
            }
          }, 5000)
        }
      } else if (pc.iceConnectionState === 'failed') {
        debugError(`❌ ICE connection failed (${peerId})`)
        debugError('💡 ICE failed - this usually means NAT traversal failed. May need TURN servers.')

        if (!isStreamer) {
          // Immediately attempt reconnection on failure
          attemptReconnect(1)
        }

        // Clean up failed viewer (if streamer)
        if (isStreamer) {
          peerConnectionsRef.current.delete(peerId)
          pc.close()
        }
      } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        debugLog(`✅ ICE ${pc.iceConnectionState} to ${isStreamer ? 'viewer' : 'streamer'}: ${peerId}`)

        // Connection successful - reset reconnection state
        if (!isStreamer) {
          onConnectionSuccess()
          // Store the streamer ID for potential reconnection
          connectedStreamerIdRef.current = peerId
        }

        // DEBUGGING: Manually check for tracks when connected
        if (!isStreamer) {
          debugLog('🔍 Manually checking for received tracks on viewer side...')
          const receivers = pc.getReceivers()
          debugLog(`   Found ${receivers.length} receivers`)
          receivers.forEach((receiver, idx) => {
            debugLog(`   Receiver ${idx}:`, {
              track: receiver.track ? {
                kind: receiver.track.kind,
                id: receiver.track.id,
                enabled: receiver.track.enabled,
                readyState: receiver.track.readyState,
                muted: receiver.track.muted
              } : null
            })
          })

          // Try to manually create stream from receivers
          const tracks = receivers.map(r => r.track).filter(t => t !== null)
          if (tracks.length > 0 && videoRef.current) {
            debugLog('🔧 Manually creating stream from receiver tracks')
            const stream = new MediaStream(tracks)
            videoRef.current.srcObject = stream
            debugLog('✅ Manually set video srcObject')
            videoRef.current.play().catch((err) => {
              debugError('❌ Error playing video:', err)
            })
          } else {
            debugWarn('⚠️ No tracks found in receivers or no video element')
          }
        }
      }
    }

    return pc
  }

  /**
   * Send signaling message to Firebase
   */
  const sendSignal = async (signal: SignalData) => {
    try {
      const signalingRef = ref(database, SIGNALING_PATH)
      await push(signalingRef, signal)
    } catch (err) {
      debugError('Error sending signal:', err)
    }
  }

  /**
   * Attempt to reconnect as viewer
   */
  const attemptReconnect = useCallback(async (attemptNumber: number) => {
    const streamerId = connectedStreamerIdRef.current || activeStream?.streamerId

    if (!streamerId) {
      debugError('❌ Cannot reconnect: no streamer ID')
      setError('Cannot reconnect: stream no longer available')
      setIsReconnecting(false)
      return
    }

    if (attemptNumber > MAX_RECONNECT_ATTEMPTS) {
      debugError(`❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`)
      setError('Connection failed. Please try rejoining manually.')
      setIsReconnecting(false)
      setReconnectAttempt(0)
      return
    }

    debugLog(`🔄 Reconnection attempt ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS}...`)
    setIsReconnecting(true)
    setReconnectAttempt(attemptNumber)
    setError(`Reconnecting... (attempt ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS})`)

    // Clean up old peer connection
    if (viewerPeerConnectionRef.current) {
      viewerPeerConnectionRef.current.close()
      viewerPeerConnectionRef.current = null
    }

    // Clear ICE candidate queue for clean slate
    iceCandidateQueueRef.current.clear()

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    try {
      // Send new join request to streamer
      await sendSignal({
        type: 'join-request',
        from: userIdRef.current,
        to: streamerId,
        data: { reconnect: true, attempt: attemptNumber },
        timestamp: Date.now(),
      })

      debugLog(`✅ Sent reconnection join request (attempt ${attemptNumber})`)
    } catch (err) {
      debugError('❌ Error sending reconnection request:', err)

      // Schedule next attempt with exponential backoff
      const delay = RECONNECT_DELAY_MS * Math.pow(RECONNECT_BACKOFF_MULTIPLIER, attemptNumber - 1)
      debugLog(`⏳ Retrying in ${delay}ms...`)

      reconnectTimerRef.current = setTimeout(() => {
        attemptReconnect(attemptNumber + 1)
      }, delay)
    }
  }, [activeStream])

  /**
   * Cancel any pending reconnection attempts
   */
  const cancelReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    setIsReconnecting(false)
    setReconnectAttempt(0)
  }, [])

  /**
   * Reset reconnection state on successful connection
   */
  const onConnectionSuccess = useCallback(() => {
    debugLog('✅ Connection successful, resetting reconnection state')
    cancelReconnect()
    setError(null)
  }, [cancelReconnect])

  /**
   * Start screen capture (streamer)
   */
  const startStream = useCallback(async () => {
    try {
      setError(null)

      // Request screen capture with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
        } as any,
        audio: true,
      })

      localStreamRef.current = stream
      setIsStreaming(true)

      // Update stream state in Firebase
      const streamStateRef = ref(database, STREAM_STATE_PATH)
      await set(streamStateRef, {
        streamerId: userIdRef.current,
        streamerName: userIdRef.current,
        active: true,
        timestamp: Date.now(),
      } as StreamState)

      // Attach to local video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Handle when user clicks "Stop sharing" in browser UI
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopStream()
      })

      debugLog('✅ Screen sharing started, waiting for viewers...')
      return true
    } catch (err) {
      debugError('Error starting screen share:', err)
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Screen sharing permission denied')
        } else {
          setError(`Failed to start screen share: ${err.message}`)
        }
      } else {
        setError('Failed to start screen share')
      }
      return false
    }
  }, [])

  /**
   * Stop screen capture (streamer)
   */
  const stopStream = useCallback(async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      pc.close()
    })
    peerConnectionsRef.current.clear()

    // Clear ICE candidate queues
    iceCandidateQueueRef.current.clear()

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsStreaming(false)

    // Clear stream state from Firebase
    const streamStateRef = ref(database, STREAM_STATE_PATH)
    await set(streamStateRef, {
      active: false,
      timestamp: Date.now(),
    })

    // Clear signaling data
    const signalingRef = ref(database, SIGNALING_PATH)
    await remove(signalingRef)

    debugLog('🛑 Screen sharing stopped')
  }, [])

  /**
   * Join as viewer
   */
  const joinAsViewer = useCallback(async () => {
    try {
      debugLog('👀 Attempting to join as viewer...')
      debugLog('📋 Viewer ID:', userIdRef.current)
      debugLog('📡 Streamer ID:', activeStream?.streamerId)

      setError(null)
      setIsViewing(true)

      if (!activeStream?.streamerId) {
        debugError('❌ No active stream to join')
        setError('No active stream available')
        return false
      }

      // Store streamer ID for potential reconnection
      connectedStreamerIdRef.current = activeStream.streamerId

      // Send join request to streamer
      await sendSignal({
        type: 'join-request',
        from: userIdRef.current,
        to: activeStream.streamerId,
        data: null,
        timestamp: Date.now(),
      })

      debugLog('✅ Sent join request to streamer:', activeStream.streamerId)
      return true
    } catch (err) {
      debugError('❌ Error joining as viewer:', err)
      setError('Failed to join stream')
      return false
    }
  }, [activeStream])

  /**
   * Leave as viewer
   */
  const leaveAsViewer = useCallback(() => {
    // Cancel any pending reconnection attempts
    cancelReconnect()

    if (viewerPeerConnectionRef.current) {
      viewerPeerConnectionRef.current.close()
      viewerPeerConnectionRef.current = null
    }

    // Clear ICE candidate queues
    iceCandidateQueueRef.current.clear()

    // Clear stored streamer ID
    connectedStreamerIdRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsViewing(false)
    setError(null)
    debugLog('👋 Left viewer mode')
  }, [cancelReconnect])

  /**
   * Attach video element reference
   */
  const attachVideo = useCallback((videoElement: HTMLVideoElement | null) => {
    videoRef.current = videoElement
    if (videoElement && localStreamRef.current) {
      videoElement.srcObject = localStreamRef.current
    }
  }, [])

  /**
   * Run diagnostics on current connection state
   * Call this from browser console: window.streamDiagnostics?.()
   */
  const runDiagnostics = useCallback(async () => {
    debugLog('🔬 ========== STREAM DIAGNOSTICS ==========')
    debugLog('📊 Hook State:', {
      isStreaming,
      isViewing,
      isReconnecting,
      reconnectAttempt,
      hasActiveStream: !!activeStream,
      error
    })

    // Check video element
    if (videoRef.current) {
      const video = videoRef.current
      debugLog('📹 Video Element:', {
        srcObject: !!video.srcObject,
        readyState: video.readyState,
        readyStateLabel: ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][video.readyState],
        paused: video.paused,
        ended: video.ended,
        muted: video.muted,
        volume: video.volume,
        currentTime: video.currentTime,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        clientWidth: video.clientWidth,
        clientHeight: video.clientHeight,
        networkState: video.networkState,
        error: video.error
      })

      // Check if srcObject has tracks
      if (video.srcObject instanceof MediaStream) {
        const stream = video.srcObject
        debugLog('📺 MediaStream:', {
          id: stream.id,
          active: stream.active,
          tracks: stream.getTracks().map(t => ({
            kind: t.kind,
            id: t.id,
            label: t.label,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState
          }))
        })
      } else {
        debugError('❌ srcObject is not a MediaStream or is null')
      }
    } else {
      debugError('❌ No video element reference')
    }

    // Check peer connection (viewer side)
    if (viewerPeerConnectionRef.current) {
      const pc = viewerPeerConnectionRef.current
      debugLog('🔗 Viewer Peer Connection:', {
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        connectionState: pc.connectionState,
        signalingState: pc.signalingState
      })

      debugLog('📥 Receivers:', pc.getReceivers().map(r => ({
        track: r.track ? {
          kind: r.track.kind,
          id: r.track.id,
          enabled: r.track.enabled,
          muted: r.track.muted,
          readyState: r.track.readyState
        } : null
      })))

      // Get WebRTC stats
      try {
        const stats = await pc.getStats()
        const statsReport: Record<string, any> = {}
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            statsReport.inboundVideo = {
              bytesReceived: report.bytesReceived,
              packetsReceived: report.packetsReceived,
              packetsLost: report.packetsLost,
              framesDecoded: report.framesDecoded,
              framesDropped: report.framesDropped,
              frameWidth: report.frameWidth,
              frameHeight: report.frameHeight,
              framesPerSecond: report.framesPerSecond
            }
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            statsReport.candidatePair = {
              localCandidateId: report.localCandidateId,
              remoteCandidateId: report.remoteCandidateId,
              state: report.state,
              bytesReceived: report.bytesReceived,
              bytesSent: report.bytesSent
            }
          }
        })
        debugLog('📈 WebRTC Stats:', statsReport)

        if (!statsReport.inboundVideo) {
          debugError('❌ No inbound video stats - video may not be flowing')
        } else if (statsReport.inboundVideo.bytesReceived === 0) {
          debugError('❌ Zero bytes received - connection established but no data flowing')
        } else if (statsReport.inboundVideo.framesDecoded === 0) {
          debugError('❌ Frames received but none decoded - possible codec issue')
        }
      } catch (err) {
        debugError('❌ Error getting stats:', err)
      }
    }

    // Check streamer peer connections
    if (peerConnectionsRef.current.size > 0) {
      debugLog(`🔗 Streamer has ${peerConnectionsRef.current.size} peer connections`)
      peerConnectionsRef.current.forEach((pc, viewerId) => {
        debugLog(`  Viewer ${viewerId}:`, {
          iceConnectionState: pc.iceConnectionState,
          connectionState: pc.connectionState,
          senders: pc.getSenders().map(s => s.track?.kind || 'no track')
        })
      })
    }

    debugLog('🔬 ========== END DIAGNOSTICS ==========')
  }, [isStreaming, isViewing, isReconnecting, reconnectAttempt, activeStream, error])

  // Expose diagnostics to window for easy console access
  if (typeof window !== 'undefined') {
    (window as any).streamDiagnostics = runDiagnostics
  }

  return {
    isStreaming,
    isViewing,
    activeStream,
    error,
    isReconnecting,
    reconnectAttempt,
    startStream,
    stopStream,
    joinAsViewer,
    leaveAsViewer,
    attachVideo,
    cancelReconnect,
    runDiagnostics,
  }
}
