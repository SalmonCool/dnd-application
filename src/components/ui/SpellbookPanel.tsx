/**
 * SpellbookPanel Component
 * ========================
 * Slide-in panel from the right for spell management and casting
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSpellbook } from '../../hooks/useSpellbook'
import type { DiceType } from '../../types/spell'

interface SpellbookPanelProps {
  isOpen: boolean
  onClose: () => void
}

const DICE_TYPES: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20']

export default function SpellbookPanel({ isOpen, onClose }: SpellbookPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [spellName, setSpellName] = useState('')
  const [spellDiceType, setSpellDiceType] = useState<DiceType>('d6')
  const [spellDiceCount, setSpellDiceCount] = useState(1)
  const [spellDescription, setSpellDescription] = useState('')
  const [spellSoundUrl, setSpellSoundUrl] = useState('')
  const [castingSpellId, setCastingSpellId] = useState<string | null>(null)

  const { spells, loading, error, addSpell, removeSpell, castSpell, broadcastSpellCast } = useSpellbook()

  // Get username from localStorage (same as chat)
  const username = localStorage.getItem('dnd_chat_username') || 'Anonymous'

  const handleAddSpell = async (e: FormEvent) => {
    e.preventDefault()
    if (spellName.trim()) {
      await addSpell(spellName, spellDiceType, spellDiceCount, spellDescription, username, spellSoundUrl)
      setSpellName('')
      setSpellDiceType('d6')
      setSpellDiceCount(1)
      setSpellDescription('')
      setSpellSoundUrl('')
      setShowAddModal(false)
    }
  }

  const handleCastSpell = (spellId: string) => {
    const spell = spells.find(s => s.id === spellId)
    if (!spell) return

    // Trigger shake animation
    setCastingSpellId(spellId)
    setTimeout(() => setCastingSpellId(null), 500)

    const { rolls, total } = castSpell(spell)

    // Build the chat message
    const diceNotation = `${spell.diceCount}${spell.diceType}`
    const rollsStr = rolls.length > 1 ? ` (${rolls.join(' + ')})` : ''
    let message = `cast ${spell.name} and rolled ${diceNotation}${rollsStr} = ${total}`

    if (spell.description) {
      message += ` - ${spell.description}`
    }

    // Send to chat via global function
    if ((window as any).__sendSpellCast) {
      (window as any).__sendSpellCast(spell.name, diceNotation, total, spell.description)
    } else {
      console.log('Spell cast:', message)
    }

    // Broadcast spell cast for sound playback to all players
    if (spell.soundUrl) {
      broadcastSpellCast(spell, username)
    }
  }

  return (
    <div className={`spellbook-panel ${isOpen ? 'open' : ''}`}>
      <div className="spellbook-header">
        <h2>Spellbook</h2>
        <button className="close-button" onClick={onClose} title="Close spellbook">
          ✕
        </button>
      </div>

      {/* Spell List */}
      <div className="spell-list">
        {loading && <div className="spell-status">Loading spells...</div>}
        {error && <div className="spell-error">Error: {error}</div>}
        {!loading && spells.length === 0 && (
          <div className="spell-status">No spells yet. Add your first spell!</div>
        )}
        {spells.map((spell) => (
          <div key={spell.id} className={`spell-card ${castingSpellId === spell.id ? 'casting' : ''}`}>
            <div className="spell-info">
              <span className="spell-name">
                {spell.name}
                {spell.soundUrl && <span className="spell-sound-indicator" title="Has sound effect">🔊</span>}
              </span>
              <span className="spell-dice">{spell.diceCount}{spell.diceType}</span>
              {spell.description && (
                <span className="spell-description">{spell.description}</span>
              )}
            </div>
            <div className="spell-actions">
              <button
                className="cast-button"
                onClick={() => handleCastSpell(spell.id)}
                title="Cast spell"
              >
                Cast
              </button>
              <button
                className="delete-spell-button"
                onClick={() => removeSpell(spell.id)}
                title="Delete spell"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Spell Button */}
      <div className="spellbook-footer">
        <button
          className="add-spell-button"
          onClick={() => setShowAddModal(true)}
        >
          + Add Spell
        </button>
      </div>

      {/* Add Spell Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content spell-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Spell</h3>
            <form onSubmit={handleAddSpell}>
              <div className="form-group">
                <label>Spell Name *</label>
                <input
                  type="text"
                  className="spell-input"
                  placeholder="Fireball, Magic Missile..."
                  value={spellName}
                  onChange={(e) => setSpellName(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Dice Type</label>
                  <select
                    className="spell-select"
                    value={spellDiceType}
                    onChange={(e) => setSpellDiceType(e.target.value as DiceType)}
                  >
                    {DICE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Number of Dice</label>
                  <select
                    className="spell-select"
                    value={spellDiceCount}
                    onChange={(e) => setSpellDiceCount(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="spell-preview">
                Roll: {spellDiceCount}{spellDiceType}
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  className="spell-textarea"
                  placeholder="Brief description of the spell effect..."
                  value={spellDescription}
                  onChange={(e) => setSpellDescription(e.target.value)}
                  maxLength={200}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Sound Effect URL (optional)</label>
                <input
                  type="text"
                  className="spell-input"
                  placeholder="https://youtube.com/watch?v=..."
                  value={spellSoundUrl}
                  onChange={(e) => setSpellSoundUrl(e.target.value)}
                />
                <span className="spell-hint">YouTube URL to play when spell is cast</span>
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={() => {
                    setShowAddModal(false)
                    setSpellName('')
                    setSpellDiceType('d6')
                    setSpellDiceCount(1)
                    setSpellDescription('')
                    setSpellSoundUrl('')
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-confirm"
                  disabled={!spellName.trim()}
                >
                  Add Spell
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
