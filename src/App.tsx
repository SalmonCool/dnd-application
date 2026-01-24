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

/**
 * CSS Import
 * ----------
 * When you import CSS like this, it's automatically applied to this component
 * and any child components. The styles are NOT scoped by default - they're global.
 *
 * For scoped styles, React offers:
 *   - CSS Modules (Component.module.css)
 *   - Styled-components library
 *   - Tailwind CSS utility classes
 */
import { useState, useEffect } from 'react'
import './App.css'

/**
 * Named Import
 * ------------
 * Using { Scene } imports a specific export from the module.
 * This is different from "default" imports like: import Scene from './Scene'
 *
 * We set up the index.ts file in components/3d/ to re-export components,
 * making imports cleaner: './components/3d' instead of './components/3d/Scene'
 */
import { Scene } from './components/3d'
import { ChatPanel, StreamPanel, ScreenSelectModal } from './components/ui'
import { useStream } from './hooks/useStream'

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

function App() {
  // State for roll value display and multiplier
  const [displayValue, setDisplayValue] = useState<number | null>(null)
  const [multiplier, setMultiplier] = useState(1)
  const [selectedDice, setSelectedDice] = useState<DiceType>('d20')
  const [chatOpen, setChatOpen] = useState(false)
  const [streamOpen, setStreamOpen] = useState(false)
  const [showStreamModal, setShowStreamModal] = useState(false)

  // Multiple dice state
  const [diceCount, setDiceCount] = useState(1)
  const [_diceResults, setDiceResults] = useState<number[]>([])
  const [_isRolling, setIsRolling] = useState(false)
  const [rollTrigger, setRollTrigger] = useState(0)
  const [diceResetKey, setDiceResetKey] = useState(0)

  // Reset dice when count or type changes
  const handleDiceCountChange = (count: number) => {
    setDiceCount(count)
    setDiceResetKey(prev => prev + 1)
    setDisplayValue(null)
    setDiceResults([])
  }

  const handleDiceTypeChange = (type: DiceType) => {
    setSelectedDice(type)
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

  const handleNewSession = () => {
    if (confirm('Are you sure you want to start a new session? This will clear all chat history.')) {
      if ((window as any).__clearMessages) {
        (window as any).__clearMessages()
      }
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
    if (isViewing) {
      leaveAsViewer()
    }
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
        <h1>D&D Application</h1>
        <div className="header-buttons">
          <button className="new-session-button" onClick={handleNewSession}>
            Start New Session
          </button>
          <button className="reset-stream-button" onClick={handleResetStream}>
            Reset Stream
          </button>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
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
          <button
            className={`dice-icon ${selectedDice === 'd4' ? 'selected' : ''}`}
            onClick={() => handleDiceTypeChange('d4')}
            title="D4 - Four-sided die"
          >
            <span className="dice-label">D4</span>
          </button>
          <button
            className={`dice-icon ${selectedDice === 'd6' ? 'selected' : ''}`}
            onClick={() => handleDiceTypeChange('d6')}
            title="D6 - Six-sided die"
          >
            <span className="dice-label">D6</span>
          </button>
          <button
            className={`dice-icon ${selectedDice === 'd8' ? 'selected' : ''}`}
            onClick={() => handleDiceTypeChange('d8')}
            title="D8 - Eight-sided die"
          >
            <span className="dice-label">D8</span>
          </button>
          <button
            className={`dice-icon ${selectedDice === 'd10' ? 'selected' : ''}`}
            onClick={() => handleDiceTypeChange('d10')}
            title="D10 - Ten-sided die"
          >
            <span className="dice-label">D10</span>
          </button>
          <button
            className={`dice-icon ${selectedDice === 'd12' ? 'selected' : ''}`}
            onClick={() => handleDiceTypeChange('d12')}
            title="D12 - Twelve-sided die"
          >
            <span className="dice-label">D12</span>
          </button>
          <button
            className={`dice-icon ${selectedDice === 'd20' ? 'selected' : ''}`}
            onClick={() => handleDiceTypeChange('d20')}
            title="D20 - Twenty-sided die"
          >
            <span className="dice-label">D20</span>
          </button>

          {/* Chat Button */}
          <button
            className={`dice-icon ${chatOpen ? 'selected' : ''}`}
            onClick={() => setChatOpen(!chatOpen)}
            title="Open chat"
          >
            <span className="dice-label">💬</span>
          </button>

          {/* Stream Button */}
          <button
            className={`dice-icon ${streamOpen ? 'selected' : ''}`}
            onClick={handleStartStreamClick}
            title={isStreaming ? "Manage stream" : "Start screen share"}
          >
            <span className="dice-label">📺</span>
          </button>
        </aside>

        {/* Dice Count Bar - slides in when dice is selected */}
        <div className={`dice-count-bar ${selectedDice ? 'visible' : ''}`}>
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
        <div className="scene-container">
          <Scene
            onRollComplete={handleRollComplete}
            onStartRoll={handleStartRoll}
            displayValue={displayValue}
            selectedDice={selectedDice}
            diceCount={diceCount}
            rollTrigger={rollTrigger}
            diceResetKey={diceResetKey}
          />
        </div>
      </main>

      {/* Multiply Buttons - Bottom Right */}
      <div className="multiplier-container">
        <button
          className="reset-button"
          onClick={handleResetMultiplier}
          disabled={multiplier <= 1}
          title="Reset multiplier to 1"
        >
          Reset
        </button>
        <div className="multiply-buttons">
          {multiplier > 1 && (
            <span className="multiplier-display">Current: {multiplier}x</span>
          )}
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
        attachVideo={attachVideo}
        error={streamError}
      />

      {/* Screen Select Modal */}
      {showStreamModal && (
        <ScreenSelectModal
          onStartStream={handleStartStream}
          onClose={() => setShowStreamModal(false)}
          error={streamError}
        />
      )}
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
