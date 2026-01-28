/**
 * InitiativePanel Component
 * =========================
 * Slide-in panel from the left for D&D initiative order tracking
 */

import { useState, useRef, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useInitiative } from '../../hooks/useInitiative'

interface InitiativePanelProps {
  isOpen: boolean
  onClose: () => void
}

// Turn notification sound (place mp3 in public/sounds/)
const TURN_SOUND_FILEPATH = '/sounds/turn-notification.mp3'

export default function InitiativePanel({ isOpen, onClose }: InitiativePanelProps) {
  const [inputName, setInputName] = useState('')
  const [inputInitiative, setInputInitiative] = useState('')
  const [showClearModal, setShowClearModal] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const {
    entries,
    loading,
    error,
    currentTurnEntry,
    addEntry,
    removeEntry,
    setCurrentTurn,
    nextTurn,
    clearInitiative,
  } = useInitiative()

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(TURN_SOUND_FILEPATH)
    audioRef.current.volume = 0.5

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Play turn sound
  const playTurnSound = () => {
    if (audioRef.current) {
      // Get volume from settings if available
      const volume = window.__getVolume?.('sfx') ?? 0.5
      audioRef.current.volume = volume
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(err => {
        console.error('Error playing turn sound:', err)
      })
    }
  }

  // Send turn message to chat
  const sendTurnMessage = (name: string) => {
    if ((window as any).__sendInitiativeTurn) {
      (window as any).__sendInitiativeTurn(name)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (inputName.trim() && inputInitiative.trim()) {
      const initiative = parseInt(inputInitiative)
      if (!isNaN(initiative)) {
        await addEntry(inputName.trim(), initiative)
        setInputName('')
        setInputInitiative('')
      }
    }
  }

  const handleNextTurn = async () => {
    const nextEntry = await nextTurn()
    if (nextEntry) {
      playTurnSound()
      sendTurnMessage(nextEntry.name)
    }
  }

  const handleStartCombat = async () => {
    if (entries.length > 0) {
      // Start with highest initiative
      await setCurrentTurn(entries[0].id)
      playTurnSound()
      sendTurnMessage(entries[0].name)
    }
  }

  const handleClearInitiative = async () => {
    await clearInitiative()
    setShowClearModal(false)
  }

  const handleSelectTurn = async (entryId: string, name: string) => {
    await setCurrentTurn(entryId)
    playTurnSound()
    sendTurnMessage(name)
  }

  return (
    <div className={`initiative-panel ${isOpen ? 'open' : ''}`}>
      <div className="initiative-header">
        <h2>Initiative Order</h2>
        <button className="close-button" onClick={onClose} title="Close initiative">
          ✕
        </button>
      </div>

      {/* Current Turn Display */}
      {currentTurnEntry && (
        <div className="current-turn-display">
          <span className="current-turn-label">Current Turn</span>
          <span className="current-turn-name">{currentTurnEntry.name}</span>
          <span className="current-turn-initiative">({currentTurnEntry.initiative})</span>
        </div>
      )}

      {/* Next Turn Button */}
      <div className="turn-controls">
        {currentTurnEntry ? (
          <button
            className="next-turn-button"
            onClick={handleNextTurn}
            disabled={entries.length === 0}
          >
            Next Turn ➡
          </button>
        ) : (
          <button
            className="start-combat-button"
            onClick={handleStartCombat}
            disabled={entries.length === 0}
          >
            Start Combat ⚔
          </button>
        )}
      </div>

      {/* Initiative List */}
      <div className="initiative-list">
        {loading && <div className="initiative-status">Loading initiative...</div>}
        {error && <div className="initiative-error">Error: {error}</div>}
        {!loading && entries.length === 0 && (
          <div className="initiative-status">No combatants yet. Add initiative below!</div>
        )}
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className={`initiative-entry ${currentTurnEntry?.id === entry.id ? 'current-turn' : ''}`}
            onClick={() => handleSelectTurn(entry.id, entry.name)}
          >
            <span className="entry-position">{index + 1}</span>
            <span className="entry-initiative">{entry.initiative}</span>
            <span className="entry-name">{entry.name}</span>
            <button
              className="remove-entry-button"
              onClick={(e) => {
                e.stopPropagation()
                removeEntry(entry.id)
              }}
              title="Remove from initiative"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Add Entry Form */}
      <form className="add-initiative-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <input
            type="text"
            className="name-input"
            placeholder="Character/Monster name..."
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
          />
          <input
            type="number"
            className="initiative-input"
            placeholder="Init"
            value={inputInitiative}
            onChange={(e) => setInputInitiative(e.target.value)}
          />
        </div>
        <div className="form-buttons">
          <button
            type="submit"
            className="add-entry-button"
            disabled={!inputName.trim() || !inputInitiative.trim()}
          >
            Add to Initiative
          </button>
          <button
            type="button"
            className="clear-initiative-button"
            onClick={() => setShowClearModal(true)}
            disabled={entries.length === 0}
          >
            Clear All
          </button>
        </div>
      </form>

      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Clear Initiative?</h3>
            <p>Are you sure you want to remove all {entries.length} combatant{entries.length !== 1 ? 's' : ''} from initiative?</p>
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={() => setShowClearModal(false)}>
                Cancel
              </button>
              <button className="modal-confirm" onClick={handleClearInitiative}>
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
