/**
 * SoundboardPanel Component
 * =========================
 * Slide-out panel for managing sound effects with hotkey bindings
 */

import { useState, useEffect, useCallback } from 'react'
import { useSoundboard } from '../../hooks/useSoundboard'
import type { SoundEffect } from '../../types/soundboard'

const USERNAME_KEY = 'dnd_chat_username'

// Valid hotkeys (letters and numbers)
const VALID_HOTKEYS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z'
]

interface SoundboardPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function SoundboardPanel({ isOpen, onClose }: SoundboardPanelProps) {
  const [username] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(USERNAME_KEY) : null
  )
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [editingHotkey, setEditingHotkey] = useState<string | null>(null)
  const [hotkeyError, setHotkeyError] = useState<string | null>(null)

  const { sounds, loading, error, addSound, removeSound, setHotkey, playSound, getSoundByHotkey } = useSoundboard()

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if Ctrl is held and we're not in an input
      if (!e.ctrlKey) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const key = e.key.toUpperCase()
      if (VALID_HOTKEYS.includes(key)) {
        const sound = getSoundByHotkey(key)
        if (sound) {
          e.preventDefault()
          playSound(sound)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [getSoundByHotkey, playSound])

  const handleAddSound = async () => {
    if (!newUrl.trim()) return

    try {
      await addSound(newTitle.trim() || 'Untitled Sound', newUrl.trim())
      setNewTitle('')
      setNewUrl('')
      setShowAddForm(false)
    } catch (err) {
      console.error('Failed to add sound:', err)
    }
  }

  const handleRemoveSound = async (soundId: string) => {
    if (!confirm('Are you sure you want to remove this sound?')) return

    try {
      await removeSound(soundId)
    } catch (err) {
      console.error('Failed to remove sound:', err)
    }
  }

  const handleSetHotkey = async (soundId: string, hotkey: string | null) => {
    try {
      setHotkeyError(null)
      await setHotkey(soundId, hotkey)
      setEditingHotkey(null)
    } catch (err) {
      if (err instanceof Error) {
        setHotkeyError(err.message)
      }
    }
  }

  const handlePlaySound = async (sound: SoundEffect) => {
    try {
      await playSound(sound)
    } catch (err) {
      console.error('Failed to play sound:', err)
    }
  }

  const getUsedHotkeys = useCallback(() => {
    return sounds.filter(s => s.hotkey).map(s => s.hotkey!.toUpperCase())
  }, [sounds])

  if (!username) {
    return (
      <div className={`soundboard-panel ${isOpen ? 'open' : ''}`}>
        <div className="soundboard-login-required">
          <p>Please log in to use the soundboard.</p>
          <button className="soundboard-close-button" onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`soundboard-panel ${isOpen ? 'open' : ''}`}>
      {/* Header */}
      <div className="soundboard-header">
        <h2>Soundboard</h2>
        <button className="close-button" onClick={onClose} title="Close soundboard">
          ✕
        </button>
      </div>

      {/* Add Sound Button */}
      <div className="soundboard-actions">
        <button
          className="soundboard-add-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Sound'}
        </button>
      </div>

      {/* Add Sound Form */}
      {showAddForm && (
        <div className="soundboard-add-form">
          <input
            type="text"
            placeholder="Sound name..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="soundboard-input"
          />
          <input
            type="text"
            placeholder="YouTube URL..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="soundboard-input"
            onKeyDown={(e) => e.key === 'Enter' && handleAddSound()}
          />
          <button
            className="soundboard-submit-btn"
            onClick={handleAddSound}
            disabled={!newUrl.trim()}
          >
            Add Sound
          </button>
        </div>
      )}

      {/* Error Display */}
      {hotkeyError && (
        <div className="soundboard-error">{hotkeyError}</div>
      )}

      {/* Sound List */}
      <div className="soundboard-list">
        {loading && <div className="soundboard-status">Loading sounds...</div>}
        {error && <div className="soundboard-error">{error}</div>}
        {!loading && sounds.length === 0 && (
          <div className="soundboard-status">No sounds yet. Add one!</div>
        )}

        {sounds.map((sound) => (
          <div key={sound.id} className="soundboard-item">
            <div className="soundboard-item-info">
              <span className="soundboard-item-title">{sound.title}</span>
              <span className="soundboard-item-added">by {sound.addedBy}</span>
            </div>

            <div className="soundboard-item-actions">
              {/* Hotkey Selector */}
              {editingHotkey === sound.id ? (
                <select
                  className="soundboard-hotkey-select"
                  value={sound.hotkey || ''}
                  onChange={(e) => handleSetHotkey(sound.id, e.target.value || null)}
                  onBlur={() => setEditingHotkey(null)}
                  autoFocus
                >
                  <option value="">None</option>
                  {VALID_HOTKEYS.map((key) => {
                    const isUsed = getUsedHotkeys().includes(key) && sound.hotkey !== key
                    return (
                      <option key={key} value={key} disabled={isUsed}>
                        Ctrl+{key} {isUsed ? '(used)' : ''}
                      </option>
                    )
                  })}
                </select>
              ) : (
                <button
                  className="soundboard-hotkey-btn"
                  onClick={() => setEditingHotkey(sound.id)}
                  title="Set hotkey"
                >
                  {sound.hotkey ? `Ctrl+${sound.hotkey}` : 'Set Key'}
                </button>
              )}

              {/* Play Button */}
              <button
                className="soundboard-play-btn"
                onClick={() => handlePlaySound(sound)}
                title="Play sound"
              >
                ▶
              </button>

              {/* Remove Button */}
              <button
                className="soundboard-remove-btn"
                onClick={() => handleRemoveSound(sound.id)}
                title="Remove sound"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Hotkey Instructions */}
      <div className="soundboard-instructions">
        <p>Press <strong>Ctrl + Hotkey</strong> to play sounds</p>
      </div>
    </div>
  )
}
