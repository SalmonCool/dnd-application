/**
 * App.tsx - Root Application Component
 * =====================================
 * The main component that structures our D&D application.
 * This component is rendered by main.tsx and contains all other components.
 *
 * REACT COMPONENT BASICS:
 * -----------------------
 * A React component is a reusable piece of UI. Components can:
 *   - Accept inputs (called "props")
 *   - Manage their own data (called "state")
 *   - Return JSX (the HTML-like syntax you see below)
 *
 * This is a "functional component" - a function that returns JSX.
 * (The older style was "class components" - but functional is now preferred)
 */


import { useState, useEffect, useRef, useCallback } from 'react'
import './css/All.css'
import { Scene } from './components/3d'
import { ChatPanel, StreamPanel, ScreenSelectModal, PlaylistPanel, SpellbookPanel, SpellSoundPlayer, VolumePanel, NotesPanel, SoundboardPanel, SoundboardPlayer, InitiativePanel, CharacterPanel, NoteInputModal, MobileMenu, DiceSelectPanel, DiceCountPanel, LandscapeWarning } from './components/ui'
import { useIsMobile } from './hooks/useIsMobile'
import { useStream } from './hooks/useStream'
import { useVolume } from './hooks/useVolume'
import { useCharacter } from './hooks/useCharacter'
import { useSceneNotes } from './hooks/useSceneNotes'
import { useSceneDaggers } from './hooks/useSceneDaggers'
import { calculateModifier, calculateProficiencyBonus } from './types/character'

/**
 * App Component
 * -------------
 * This is a functional component. It's just a function that returns JSX.
 *
 * JSX BASICS:
 * - Looks like HTML but it's actually JavaScript
 * - Uses className instead of class (class is a reserved word in JS)
 * - All tags must be closed: <br /> not <br>
 * - You can embed JavaScript expressions with {curly braces}
 *
 * COMPONENT STRUCTURE:
 * - function name must start with a capital letter (App, not app)
 * - must return a single root element (or Fragment: <>...</>)
 * - export default makes this the main export of the file
 */
// Available dice types
type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20'
type StatType = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma' | ''
type SkillLevel = 'none' | 'proficient' | 'expert'
type SelectionType = DiceType | 'artifacts'
type ArtifactType = 'orb' | 'skull' | null

function App() {
  // Mobile detection
  const isMobile = useIsMobile()

  // State for roll value display and multiplier
  const [displayValue, setDisplayValue] = useState<number | null>(null)
  const [multiplier, setMultiplier] = useState(1)
  const [selectedDice, setSelectedDice] = useState<SelectionType | null>('artifacts')
  const [chatOpen, setChatOpen] = useState(false)
  const [streamOpen, setStreamOpen] = useState(false)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [spellbookOpen, setSpellbookOpen] = useState(false)
  const [volumeOpen, setVolumeOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [soundboardOpen, setSoundboardOpen] = useState(false)
  const [diceMenuOpen, setDiceMenuOpen] = useState(false)
  const [artifactMenuOpen, setArtifactMenuOpen] = useState(false)
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactType>('orb')
  const [initiativeOpen, setInitiativeOpen] = useState(false)
  const [characterOpen, setCharacterOpen] = useState(false)
  const [showStreamModal, setShowStreamModal] = useState(false)

  // Mobile panel state
  const [diceSelectPanelOpen, setDiceSelectPanelOpen] = useState(false)
  const [diceCountPanelOpen, setDiceCountPanelOpen] = useState(false)

  // Volume control hook (exposes __getVolume on window)
  useVolume()

  // Multiple dice state
  const [diceCount, setDiceCount] = useState(1)
  const [_diceResults, setDiceResults] = useState<number[]>([])
  const [_isRolling, setIsRolling] = useState(false)
  const [rollTrigger, setRollTrigger] = useState(0)
  const [diceResetKey, setDiceResetKey] = useState(0)

  // Unread chat messages
  const [unreadCount, setUnreadCount] = useState(0)
  const lastSeenCountRef = useRef(-1) // -1 means not initialized yet
  const chatOpenRef = useRef(false)

  // Roll modifiers
  const [flatModifier, setFlatModifier] = useState<string>('')
  const [bonusDie, setBonusDie] = useState<DiceType | ''>('')
  const [selectedStat, setSelectedStat] = useState<StatType>('')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('none')

  // Character stats for modifier calculations
  const { stats: characterStats } = useCharacter()

  // Scene notes state
  const { notes: sceneNotes, connections: sceneConnections, addNote: addSceneNote, removeNote: removeSceneNote, addConnection: addSceneConnection, removeConnection: removeSceneConnection, clearAllNotes: clearSceneNotes } = useSceneNotes()
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteClickPosition, setNoteClickPosition] = useState<{ x: number; y: number; z: number } | null>(null)
  const [connectingFromNoteId, setConnectingFromNoteId] = useState<string | null>(null)

  // Scene daggers state
  const { daggers: sceneDaggers, addDagger: addSceneDagger, removeDagger: removeSceneDagger, clearAllDaggers: clearSceneDaggers } = useSceneDaggers()

  // Track message count changes for unread badge
  const handleMessageCountChange = useCallback((count: number) => {
    // Initialize lastSeenCount on first message load
    if (lastSeenCountRef.current === -1) {
      lastSeenCountRef.current = count
      return
    }

    if (chatOpenRef.current) {
      // Chat is open, update last seen count
      lastSeenCountRef.current = count
      setUnreadCount(0)
    } else {
      // Chat is closed, calculate unread
      const unread = count - lastSeenCountRef.current
      if (unread > 0) {
        setUnreadCount(unread)
      }
    }
  }, [])

  // Handle chat open/close events from ChatPanel
  const handleChatOpenChange = useCallback((isOpen: boolean, messageCount: number) => {
    if (isOpen) {
      // Chat opened - mark all as seen
      lastSeenCountRef.current = messageCount
      setUnreadCount(0)
    }
    chatOpenRef.current = isOpen
  }, [])

  // Set up message count callbacks
  useEffect(() => {
    if (typeof window === 'undefined') return

    window.__onMessageCountChange = handleMessageCountChange
    window.__onChatOpenChange = handleChatOpenChange

    // Check if there's already a message count available
    if (window.__currentMessageCount !== undefined && lastSeenCountRef.current === -1) {
      lastSeenCountRef.current = window.__currentMessageCount
    }

    return () => {
      delete window.__onMessageCountChange
      delete window.__onChatOpenChange
    }
  }, [handleMessageCountChange, handleChatOpenChange])

  // Calculate total stat and proficiency modifier
  const getStatAndProficiencyModifier = useCallback(() => {
    let total = 0

    // Add stat modifier if a stat is selected
    if (selectedStat && characterStats[selectedStat] !== undefined) {
      total += calculateModifier(characterStats[selectedStat])
    }

    // Add proficiency bonus based on skill level
    if (skillLevel !== 'none') {
      const profBonus = calculateProficiencyBonus(characterStats.level)
      if (skillLevel === 'proficient') {
        total += profBonus
      } else if (skillLevel === 'expert') {
        total += profBonus * 2
      }
    }

    return total
  }, [selectedStat, skillLevel, characterStats])

  // Expose modifier functions for spells to use
  useEffect(() => {
    if (typeof window === 'undefined') return

    window.__getModifiers = () => ({
      flatModifier: parseInt(flatModifier) || 0,
      bonusDie: bonusDie || null,
      statModifier: getStatAndProficiencyModifier(),
    })

    window.__clearModifiers = () => {
      setFlatModifier('')
      setBonusDie('')
      setSelectedStat('')
      setSkillLevel('none')
    }

    return () => {
      delete window.__getModifiers
      delete window.__clearModifiers
    }
  }, [flatModifier, bonusDie, getStatAndProficiencyModifier])

  // Handle chat open/close
  const handleChatToggle = useCallback(() => {
    const newOpen = !chatOpen
    setChatOpen(newOpen)
    setSelectedDice(null)
    chatOpenRef.current = newOpen

    if (newOpen) {
      // Opening chat - reset unread count and update last seen
      const currentCount = window.__currentMessageCount || 0
      lastSeenCountRef.current = currentCount
      setUnreadCount(0)
    }
  }, [chatOpen])

  // Reset dice when count or type changes
  const handleDiceCountChange = (count: number) => {
    setDiceCount(count)
    setDiceResetKey(prev => prev + 1)
    setDisplayValue(null)
    setDiceResults([])
  }

  const handleDiceTypeChange = (type: SelectionType) => {
    // Toggle: clicking same dice deselects it (returns to artifacts), clicking different dice selects it
    if (selectedDice === type) {
      setSelectedDice('artifacts')
    } else {
      setSelectedDice(type)
    }
    setDiceResetKey(prev => prev + 1)
    setDisplayValue(null)
    setDiceResults([])
  }

  // Stream hook
  const {
    isStreaming,
    isViewing,
    activeStream,
    error: streamError,
    startStream,
    stopStream,
    joinAsViewer,
    leaveAsViewer,
    attachVideo,
  } = useStream()

  // Called when user initiates a roll (clicks on dice in scene)
  const handleStartRoll = () => {
    setIsRolling(true)
    setDiceResults([])
    setDisplayValue(null)
    setRollTrigger(prev => prev + 1) // Trigger all dice to roll
  }

  // Dice max values for bonus die rolling
  const DICE_MAX: Record<DiceType, number> = {
    d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20,
  }

  // Called when a single die completes its roll
  const handleRollComplete = (value: number, diceIndex: number) => {
    console.log('🎲 handleRollComplete called!', {
      diceType: selectedDice,
      value: value,
      diceIndex: diceIndex,
      diceCount: diceCount,
      sendDiceRollExists: !!(window as any).__sendDiceRoll
    })

    setDiceResults(prev => {
      const newResults = [...prev]
      newResults[diceIndex] = value

      // Check if all dice have completed
      const completedCount = newResults.filter(r => r !== undefined).length
      if (completedCount === diceCount) {
        // All dice done - calculate sum
        const sum = newResults.reduce((acc, val) => acc + val, 0)
        setDisplayValue(sum)
        setMultiplier(1) // Reset multiplier on new roll
        setIsRolling(false)

        // Send dice roll to chat with count notation
        if ((window as any).__sendDiceRoll) {
          const diceNotation = diceCount > 1 ? `${diceCount}${selectedDice}` : selectedDice
          console.log('✅ Calling __sendDiceRoll with:', diceNotation, sum)
          ;(window as any).__sendDiceRoll(diceNotation, sum)

          // Check if we have modifiers to apply
          const flatMod = parseInt(flatModifier) || 0
          const hasBonusDie = bonusDie !== ''

          // Calculate individual components
          let statMod = 0
          if (selectedStat && characterStats[selectedStat] !== undefined) {
            statMod = calculateModifier(characterStats[selectedStat])
          }

          let profBonus = 0
          if (skillLevel !== 'none') {
            const baseProfBonus = calculateProficiencyBonus(characterStats.level)
            profBonus = skillLevel === 'expert' ? baseProfBonus * 2 : baseProfBonus
          }

          const totalMod = flatMod + statMod + profBonus

          if (totalMod !== 0 || hasBonusDie) {
            // Roll bonus die if selected
            let bonusDieResult: number | null = null
            if (hasBonusDie && bonusDie) {
              bonusDieResult = Math.floor(Math.random() * DICE_MAX[bonusDie as DiceType]) + 1
            }

            // Calculate new total
            const newTotal = sum + totalMod + (bonusDieResult || 0)
            setDisplayValue(newTotal)

            // Send modifier message with individual components
            if ((window as any).__sendRollModifier) {
              ;(window as any).__sendRollModifier(
                selectedStat || null,
                statMod,
                profBonus,
                flatMod,
                hasBonusDie ? bonusDie : null,
                bonusDieResult,
                newTotal
              )
            }

            // Reset modifiers after use
            setFlatModifier('')
            setBonusDie('')
            setSelectedStat('')
            setSkillLevel('none')
          }
        } else {
          console.warn('⚠️ __sendDiceRoll not available yet')
        }
      }

      return newResults
    })
  }

  const handleMultiply = (factor: number) => {
    if (displayValue !== null) {
      const newValue = displayValue * factor
      setDisplayValue(newValue)
      setMultiplier(multiplier * factor)

      // Send multiplier to chat
      if ((window as any).__sendMultiplier) {
        (window as any).__sendMultiplier(factor, newValue)
      }
    }
  }

  const handleResetMultiplier = () => {
    if (displayValue !== null && multiplier > 1) {
      setDisplayValue(displayValue / multiplier)
      setMultiplier(1)
    }
  }

  // Handle thumbtack click for connecting notes
  const handleThumbtackClick = useCallback((noteId: string) => {
    if (connectingFromNoteId === null) {
      // Not currently connecting - ask if user wants to start
      if (confirm('Do you want to connect this note to another?')) {
        setConnectingFromNoteId(noteId)
      }
    } else if (connectingFromNoteId === noteId) {
      // Clicked the same note - cancel connection mode
      setConnectingFromNoteId(null)
    } else {
      // Clicked a different note - create connection
      const username = localStorage.getItem('dnd_chat_username') || 'Anonymous'
      addSceneConnection(connectingFromNoteId, noteId, username)
      setConnectingFromNoteId(null)
    }
  }, [connectingFromNoteId, addSceneConnection])

  const handleNewSession = () => {
    if (confirm('Are you sure you want to start a new session? This will clear all chat history, art gallery, scene notes, and daggers.')) {
      if ((window as any).__clearMessages) {
        (window as any).__clearMessages()
      }
      if ((window as any).__clearArtChannel) {
        (window as any).__clearArtChannel()
      }
      // Clear scene notes and daggers
      clearSceneNotes()
      clearSceneDaggers()
    }
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout? You will need to re-enter your password.')) {
      if ((window as any).__logout) {
        (window as any).__logout()
      }
      setChatOpen(false)
    }
  }

  // Auto-open stream panel when an active stream is detected
  useEffect(() => {
    if (activeStream && activeStream.active && !isStreaming) {
      setStreamOpen(true)
    }
  }, [activeStream, isStreaming])

  const handleStartStreamClick = () => {
    if (activeStream && activeStream.active && !isStreaming) {
      // There's already an active stream, open viewer mode
      setStreamOpen(true)
    } else {
      // No active stream, show modal to start streaming
      setShowStreamModal(true)
    }
  }

  const handleStartStream = async () => {
    const success = await startStream()
    if (success) {
      setShowStreamModal(false)
      setStreamOpen(true)
    }
  }

  const handleStopStream = () => {
    stopStream()
    setStreamOpen(false)
  }

  const handleJoinAsViewer = async () => {
    await joinAsViewer()
  }

  const handleCloseStreamPanel = () => {
    // Just close the panel - don't disconnect viewer
    setStreamOpen(false)
  }

  const handleLeaveStream = () => {
    leaveAsViewer()
    setStreamOpen(false)
  }

  const handleResetStream = async () => {
    if (confirm('Are you sure you want to reset the stream state? This will clear all stream data from the database.')) {
      try {
        const { database, ref, set, remove } = await import('./config/firebase')

        // Clear stream state
        const streamStateRef = ref(database, 'streamState')
        await set(streamStateRef, {
          active: false,
          timestamp: Date.now(),
        })

        // Clear signaling data
        const signalingRef = ref(database, 'signaling')
        await remove(signalingRef)

        // Close local connections if any
        if (isStreaming) {
          stopStream()
        }
        if (isViewing) {
          leaveAsViewer()
        }
        setStreamOpen(false)

        console.log('✅ Stream state reset successfully')
        alert('Stream state has been reset successfully')
      } catch (err) {
        console.error('Error resetting stream:', err)
        alert('Failed to reset stream state')
      }
    }
  }

  const handleResetMusicLead = async () => {
    if (confirm('Are you sure you want to reset the Music Lead? This will clear the current music lead but keep the playlist.')) {
      try {
        const { database, ref, remove } = await import('./config/firebase')

        // Clear music lead sync state
        const syncRef = ref(database, 'playlist/sync')
        await remove(syncRef)

        console.log('✅ Music Lead reset successfully')
        alert('Music Lead has been reset successfully')
      } catch (err) {
        console.error('Error resetting Music Lead:', err)
        alert('Failed to reset Music Lead')
      }
    }
  }

  return (
    /**
     * The div.app container
     * ---------------------
     * This wraps our entire application layout.
     * Check App.css to see how it's styled with flexbox.
     */
    <div className="app">
      {/**
       * Header Section
       * --------------
       * Contains the application title.
       * The <header> tag is semantic HTML - it tells browsers and screen readers
       * "this is the header section of the page"
       */}
      <header className="header">
        <h1>DragonStack</h1>
        <div className="header-buttons">
          <button className="new-session-button" onClick={handleNewSession}>
            Start New Session
          </button>
          <button className="reset-stream-button" onClick={handleResetStream}>
            Reset Stream
          </button>
          <button className="reset-music-lead-button" onClick={handleResetMusicLead}>
            Reset Music Lead
          </button>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <MobileMenu
          onNewSession={handleNewSession}
          onResetStream={handleResetStream}
          onResetMusicLead={handleResetMusicLead}
          onLogout={handleLogout}
        />
      </header>

      {/**
       * Main Content Area
       * -----------------
       * <main> is semantic HTML for the primary content of the page.
       * Screen readers and SEO benefit from proper semantic tags.
       */}
      <main className="main">
        {/* Dice Selection Sidebar */}
        <aside className="dice-sidebar">
          {/* Artifacts Button - Above dice */}
          <button
            className={`dice-icon ${selectedDice === 'artifacts' || artifactMenuOpen || diceSelectPanelOpen ? 'selected' : ''}`}
            onClick={() => {
              if (isMobile) {
                // On mobile, open the panel
                setDiceSelectPanelOpen(true)
              } else {
                // On desktop, use the submenu
                if (artifactMenuOpen) {
                  setArtifactMenuOpen(false)
                } else {
                  setArtifactMenuOpen(true)
                  setDiceMenuOpen(false)
                  handleDiceTypeChange('artifacts')
                }
              }
            }}
            title="Mystical Artifacts"
          >
            <span className="dice-label">🔮</span>
          </button>

          {/* Artifact Submenu (desktop only) */}
          {!isMobile && (
            <div className={`dice-submenu artifact-submenu ${artifactMenuOpen ? 'open' : ''}`}>
              <button
                className={`dice-submenu-item ${selectedArtifact === 'orb' ? 'selected' : ''}`}
                onClick={() => { setSelectedArtifact('orb'); setArtifactMenuOpen(false); }}
                title="Orb Of Oddlings"
              >
                🔮
              </button>
              <button
                className={`dice-submenu-item ${selectedArtifact === 'skull' ? 'selected' : ''}`}
                onClick={() => { setSelectedArtifact('skull'); setArtifactMenuOpen(false); }}
                title="Skull of Chattering"
              >
                💀
              </button>
              <button
                className={`dice-submenu-item ${selectedArtifact === null ? 'selected' : ''}`}
                onClick={() => { setSelectedArtifact(null); setArtifactMenuOpen(false); }}
                title="Cloak of Invisibility"
              >
                👻
              </button>
            </div>
          )}

          <div className="sidebar-divider" />

          {/* Dice Menu Button */}
          <button
            className={`dice-icon ${diceMenuOpen || diceSelectPanelOpen || (selectedDice && selectedDice !== 'artifacts') ? 'selected' : ''}`}
            onClick={() => {
              if (isMobile) {
                // On mobile, open the panel
                setDiceSelectPanelOpen(true)
              } else {
                // On desktop, use the submenu
                if (diceMenuOpen) {
                  // Closing menu - also deselect dice to retract count bar
                  setDiceMenuOpen(false)
                  setSelectedDice('artifacts')
                  setDiceResetKey(prev => prev + 1)
                  setDisplayValue(null)
                  setDiceResults([])
                } else {
                  // Opening menu - close artifact menu
                  setDiceMenuOpen(true)
                  setArtifactMenuOpen(false)
                }
              }
            }}
            title="Dice Menu"
          >
            <span className="dice-label">🎲</span>
          </button>

          {/* Dice Submenu (desktop only) */}
          {!isMobile && (
            <div className={`dice-submenu ${diceMenuOpen ? 'open' : ''}`}>
              <button
                className={`dice-submenu-item ${selectedDice === 'd4' ? 'selected' : ''}`}
                onClick={() => { handleDiceTypeChange('d4'); setDiceMenuOpen(false); }}
                title="D4 - Four-sided die"
              >
                D4
              </button>
              <button
                className={`dice-submenu-item ${selectedDice === 'd6' ? 'selected' : ''}`}
                onClick={() => { handleDiceTypeChange('d6'); setDiceMenuOpen(false); }}
                title="D6 - Six-sided die"
              >
                D6
              </button>
              <button
                className={`dice-submenu-item ${selectedDice === 'd8' ? 'selected' : ''}`}
                onClick={() => { handleDiceTypeChange('d8'); setDiceMenuOpen(false); }}
                title="D8 - Eight-sided die"
              >
                D8
              </button>
              <button
                className={`dice-submenu-item ${selectedDice === 'd10' ? 'selected' : ''}`}
                onClick={() => { handleDiceTypeChange('d10'); setDiceMenuOpen(false); }}
                title="D10 - Ten-sided die"
              >
                D10
              </button>
              <button
                className={`dice-submenu-item ${selectedDice === 'd12' ? 'selected' : ''}`}
                onClick={() => { handleDiceTypeChange('d12'); setDiceMenuOpen(false); }}
                title="D12 - Twelve-sided die"
              >
                D12
              </button>
              <button
                className={`dice-submenu-item ${selectedDice === 'd20' ? 'selected' : ''}`}
                onClick={() => { handleDiceTypeChange('d20'); setDiceMenuOpen(false); }}
                title="D20 - Twenty-sided die"
              >
                D20
              </button>
            </div>
          )}

          {/* Initiative Button */}
          <button
            className={`dice-icon ${initiativeOpen ? 'selected' : ''}`}
            onClick={() => { setInitiativeOpen(!initiativeOpen); setSelectedDice(null) }}
            title="Initiative Order"
          >
            <span className="dice-label">⚔</span>
          </button>

          {/* Chat Button */}
          <button
            className={`dice-icon ${chatOpen ? 'selected' : ''}`}
            onClick={handleChatToggle}
            title="Open chat"
          >
            <span className="dice-label">💬</span>
            {unreadCount > 0 && (
              <span className="chat-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {/* Stream Button */}
          <button
            className={`dice-icon ${streamOpen ? 'selected' : ''}`}
            onClick={() => { handleStartStreamClick(); setSelectedDice(null) }}
            title={isStreaming ? "Manage stream" : "Start screen share"}
          >
            <span className="dice-label">📺</span>
          </button>

          {/* Playlist Button */}
          <button
            className={`dice-icon ${playlistOpen ? 'selected' : ''}`}
            onClick={() => { setPlaylistOpen(!playlistOpen); setSelectedDice(null) }}
            title="Music Playlist"
          >
            <span className="dice-label">🎵</span>
          </button>

          {/* Volume Button */}
          <button
            className={`dice-icon ${volumeOpen ? 'selected' : ''}`}
            onClick={() => { setVolumeOpen(!volumeOpen); setSelectedDice(null) }}
            title="Volume Controls"
          >
            <span className="dice-label">🔊</span>
          </button>

          {/* Spellbook Button */}
          <button
            className={`dice-icon ${spellbookOpen ? 'selected' : ''}`}
            onClick={() => { setSpellbookOpen(!spellbookOpen); setSelectedDice(null) }}
            title="Spellbook"
          >
            <span className="dice-label">📙</span>
          </button>

          {/* Soundboard Button */}
          <button
            className={`dice-icon ${soundboardOpen ? 'selected' : ''}`}
            onClick={() => { setSoundboardOpen(!soundboardOpen); setSelectedDice(null) }}
            title="Soundboard"
          >
            <span className="dice-label">📢</span>
          </button>

          {/* Notes Button */}
          <button
            className={`dice-icon ${notesOpen ? 'selected' : ''}`}
            onClick={() => { setNotesOpen(!notesOpen); setSelectedDice(null) }}
            title="Notes"
          >
            <span className="dice-label">📝</span>
          </button>

          {/* Character Sheet Button */}
          <button
            className={`dice-icon ${characterOpen ? 'selected' : ''}`}
            onClick={() => { setCharacterOpen(!characterOpen); setSelectedDice(null) }}
            title="Character Stats"
          >
            <span className="dice-label">👤</span>
          </button>
        </aside>

        {/* Dice Count Bar - slides in when dice is selected (desktop only) */}
        {!isMobile && (
          <div className={`dice-count-bar ${selectedDice && selectedDice !== 'artifacts' ? 'visible' : ''}`}>
            <span className="count-label">Roll</span>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                className={`count-button ${diceCount === n ? 'selected' : ''}`}
                onClick={() => handleDiceCountChange(n)}
                title={`Roll ${n} ${selectedDice}${n > 1 ? 's' : ''}`}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {/**
         * 3D Scene Container
         * ------------------
         * This div holds our React Three Fiber scene.
         * The Scene component (from components/3d) renders the 3D canvas.
         *
         * COMPONENT USAGE:
         * <Scene /> - Self-closing tag because we're not passing children.
         * Could also write: <Scene></Scene>
         */}
        <div className="scene-container" onContextMenu={(e) => e.preventDefault()}>
          <Scene
            onRollComplete={handleRollComplete}
            onStartRoll={handleStartRoll}
            displayValue={displayValue}
            selectedDice={selectedDice}
            selectedArtifact={selectedArtifact}
            diceCount={diceCount}
            rollTrigger={rollTrigger}
            diceResetKey={diceResetKey}
            notes={sceneNotes}
            connections={sceneConnections}
            daggers={sceneDaggers}
            onBackgroundClick={(pos) => {
              setNoteClickPosition(pos)
              setShowNoteModal(true)
            }}
            onBackgroundLeftClick={(pos) => {
              const username = localStorage.getItem('dnd_chat_username') || 'Anonymous'
              addSceneDagger({ position: pos }, username)
            }}
            onNoteRemove={removeSceneNote}
            onConnectionRemove={removeSceneConnection}
            onDaggerRemove={removeSceneDagger}
            onThumbtackClick={handleThumbtackClick}
            connectingFromNoteId={connectingFromNoteId}
          />
        </div>
      </main>

      {/* Multiply Buttons - Bottom Right */}
      <div className="multiplier-container">
        <div className="multiply-label">Multiply</div>
        <div className="multiply-reset-button-container">
          {multiplier > 1 && (
            <span className="multiplier-display">Current: {multiplier}x</span>
          )}
          <button
            className="reset-button"
            onClick={handleResetMultiplier}
            disabled={multiplier <= 1}
            title="Reset multiplier to 1"
          >
            Reset
          </button>
          <div className="multiply-buttons">
            {[2, 3, 4, 5, 6].map((factor) => (
              <button
                key={factor}
                className="multiply-button"
                onClick={() => handleMultiply(factor)}
                disabled={displayValue === null}
              >
                x{factor}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Roll Modifier Bar - Bottom Center */}
      <div className="modifier-bar">
        <div className="modifier-input-group">
          <label htmlFor="stat-select">Stat:</label>
          <select
            id="stat-select"
            className="bonus-die-select"
            value={selectedStat}
            onChange={(e) => setSelectedStat(e.target.value as StatType)}
          >
            <option value="">None</option>
            <option value="strength">STR</option>
            <option value="dexterity">DEX</option>
            <option value="constitution">CON</option>
            <option value="intelligence">INT</option>
            <option value="wisdom">WIS</option>
            <option value="charisma">CHA</option>
          </select>
        </div>
        <div className="modifier-input-group">
          <label htmlFor="skill-level">Skill:</label>
          <select
            id="skill-level"
            className="bonus-die-select"
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
          >
            <option value="none">Not Skilled</option>
            <option value="proficient">Proficient</option>
            <option value="expert">Expert</option>
          </select>
        </div>
        <div className="modifier-input-group">
          <label htmlFor="flat-modifier">Flat +/-:</label>
          <input
            id="flat-modifier"
            type="number"
            className="flat-modifier-input"
            placeholder="+0"
            value={flatModifier}
            onChange={(e) => setFlatModifier(e.target.value)}
          />
        </div>
        <div className="modifier-input-group">
          <label htmlFor="bonus-die">Bonus die:</label>
          <select
            id="bonus-die"
            className="bonus-die-select"
            value={bonusDie}
            onChange={(e) => setBonusDie(e.target.value as DiceType | '')}
          >
            <option value="">None</option>
            <option value="d4">D4</option>
            <option value="d6">D6</option>
            <option value="d8">D8</option>
            <option value="d10">D10</option>
            <option value="d12">D12</option>
            <option value="d20">D20</option>
          </select>
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Stream Panel */}
      <StreamPanel
        isOpen={streamOpen}
        isStreaming={isStreaming}
        isViewing={isViewing}
        activeStream={activeStream}
        onClose={handleCloseStreamPanel}
        onStopStream={handleStopStream}
        onJoinAsViewer={handleJoinAsViewer}
        onLeaveStream={handleLeaveStream}
        attachVideo={attachVideo}
        error={streamError}
      />

      {/* Playlist Panel */}
      <PlaylistPanel isOpen={playlistOpen} onClose={() => setPlaylistOpen(false)} />

      {/* Volume Panel */}
      <VolumePanel isOpen={volumeOpen} onClose={() => setVolumeOpen(false)} />

      {/* Spellbook Panel */}
      <SpellbookPanel isOpen={spellbookOpen} onClose={() => setSpellbookOpen(false)} />

      {/* Soundboard Panel */}
      <SoundboardPanel isOpen={soundboardOpen} onClose={() => setSoundboardOpen(false)} />

      {/* Notes Panel */}
      <NotesPanel isOpen={notesOpen} onClose={() => setNotesOpen(false)} />

      {/* Initiative Panel */}
      <InitiativePanel isOpen={initiativeOpen} onClose={() => setInitiativeOpen(false)} />

      {/* Character Panel */}
      <CharacterPanel isOpen={characterOpen} onClose={() => setCharacterOpen(false)} />

      {/* Mobile Dice/Artifact Select Panel */}
      <DiceSelectPanel
        isOpen={diceSelectPanelOpen}
        onClose={() => setDiceSelectPanelOpen(false)}
        selectedDice={selectedDice}
        selectedArtifact={selectedArtifact}
        onDiceSelect={(dice) => {
          handleDiceTypeChange(dice)
          // On mobile, also open the dice count panel
          setDiceCountPanelOpen(true)
        }}
        onArtifactSelect={(artifact) => {
          setSelectedArtifact(artifact)
          setSelectedDice('artifacts')
        }}
      />

      {/* Mobile Dice Count Panel */}
      <DiceCountPanel
        isOpen={diceCountPanelOpen}
        onClose={() => setDiceCountPanelOpen(false)}
        selectedDice={selectedDice !== 'artifacts' ? selectedDice as DiceType : null}
        diceCount={diceCount}
        onCountSelect={handleDiceCountChange}
      />

      {/* Screen Select Modal */}
      {showStreamModal && (
        <ScreenSelectModal
          onStartStream={handleStartStream}
          onClose={() => setShowStreamModal(false)}
          error={streamError}
        />
      )}

      {/* Note Input Modal */}
      {showNoteModal && noteClickPosition && (
        <NoteInputModal
          position={noteClickPosition}
          onSubmit={(text, color, imageUrl) => {
            // Get username from localStorage
            const username = localStorage.getItem('dnd_chat_username') || 'Anonymous'
            addSceneNote({ text, position: noteClickPosition, color, imageUrl }, username)
            setShowNoteModal(false)
            setNoteClickPosition(null)
          }}
          onClose={() => {
            setShowNoteModal(false)
            setNoteClickPosition(null)
          }}
        />
      )}

      {/* Hidden spell sound player for all players */}
      <SpellSoundPlayer />

      {/* Hidden soundboard player for all players */}
      <SoundboardPlayer />

      {/* Landscape orientation warning for mobile */}
      <LandscapeWarning />
    </div>
  )
}

/**
 * Default Export
 * --------------
 * 'export default' means this is the main thing this file exports.
 * When another file does: import App from './App'
 * They get this component.
 *
 * You can also have named exports in the same file:
 *   export const someHelper = () => { ... }
 * Which would be imported as: import App, { someHelper } from './App'
 */
export default App
