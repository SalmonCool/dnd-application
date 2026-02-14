/**
 * CharacterPanel Component
 * ========================
 * Slide-up panel from the bottom for D&D character stats
 */

import { useState, useEffect } from 'react'
import { useCharacter } from '../../hooks/useCharacter'
import { calculateModifier, formatModifier, calculateProficiencyBonus, SKILL_DEFINITIONS, DEFAULT_SKILL_PROFICIENCIES } from '../../types/character'
import type { AbilityKey } from '../../types/character'

interface CharacterPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface StatInputProps {
  label: string
  shortLabel: string
  value: number
  onChange: (value: number) => void
}

function StatInput({ label, shortLabel, value, onChange }: StatInputProps) {
  // Local state for the input field - allows empty string while typing
  const [displayValue, setDisplayValue] = useState<string>(value.toString())

  // Sync display value when external value changes (e.g., from Firebase)
  useEffect(() => {
    setDisplayValue(value.toString())
  }, [value])

  // Calculate modifier based on actual value (not display value)
  const modifier = calculateModifier(value)
  const modifierStr = formatModifier(modifier)

  // Determine modifier color based on value
  const modifierClass = modifier > 0 ? 'positive' : modifier < 0 ? 'negative' : 'neutral'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    // Allow empty string or valid numbers while typing
    setDisplayValue(inputValue)

    // If it's a valid number, update the actual value
    const parsed = parseInt(inputValue)
    if (!isNaN(parsed)) {
      onChange(parsed)
    }
  }

  const handleBlur = () => {
    // On blur, if empty or invalid, reset to 10
    const parsed = parseInt(displayValue)
    if (isNaN(parsed) || displayValue === '') {
      setDisplayValue('10')
      onChange(10)
    } else {
      // Clamp to valid range and update display
      const clamped = Math.max(1, Math.min(30, parsed))
      setDisplayValue(clamped.toString())
      onChange(clamped)
    }
  }

  return (
    <div className="stat-block">
      <div className="stat-label">{shortLabel}</div>
      <div className={`stat-modifier ${modifierClass}`}>{modifierStr}</div>
      <input
        type="number"
        className="stat-input"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        min={1}
        max={30}
        title={label}
      />
    </div>
  )
}

interface LevelInputProps {
  level: number
  onChange: (value: number) => void
}

function LevelInput({ level, onChange }: LevelInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(level.toString())
  const proficiencyBonus = calculateProficiencyBonus(level)

  useEffect(() => {
    setDisplayValue(level.toString())
  }, [level])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setDisplayValue(inputValue)

    const parsed = parseInt(inputValue)
    if (!isNaN(parsed)) {
      onChange(parsed)
    }
  }

  const handleBlur = () => {
    const parsed = parseInt(displayValue)
    if (isNaN(parsed) || displayValue === '') {
      setDisplayValue('1')
      onChange(1)
    } else {
      const clamped = Math.max(1, Math.min(20, parsed))
      setDisplayValue(clamped.toString())
      onChange(clamped)
    }
  }

  return (
    <div className="level-block">
      <div className="level-section">
        <div className="stat-label">LEVEL</div>
        <input
          type="number"
          className="level-input"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          min={1}
          max={20}
          title="Character Level"
        />
      </div>
      <div className="proficiency-section">
        <div className="stat-label">PROF</div>
        <div className="proficiency-bonus">+{proficiencyBonus}</div>
      </div>
    </div>
  )
}

// Group skills by ability for display
const SKILL_GROUPS: { ability: AbilityKey; label: string }[] = [
  { ability: 'strength', label: 'STR' },
  { ability: 'dexterity', label: 'DEX' },
  { ability: 'intelligence', label: 'INT' },
  { ability: 'wisdom', label: 'WIS' },
  { ability: 'charisma', label: 'CHA' },
]

export default function CharacterPanel({ isOpen, onClose }: CharacterPanelProps) {
  const { stats, loading, error, updateStat, resetStats, updateSkillProficiency } = useCharacter()
  const [showResetModal, setShowResetModal] = useState(false)

  const statConfig: { key: AbilityKey | 'level'; label: string; short: string }[] = [
    { key: 'strength', label: 'Strength', short: 'STR' },
    { key: 'dexterity', label: 'Dexterity', short: 'DEX' },
    { key: 'constitution', label: 'Constitution', short: 'CON' },
    { key: 'intelligence', label: 'Intelligence', short: 'INT' },
    { key: 'wisdom', label: 'Wisdom', short: 'WIS' },
    { key: 'charisma', label: 'Charisma', short: 'CHA' },
  ]

  const handleResetStats = async () => {
    await resetStats()
    setShowResetModal(false)
  }

  return (
    <div className={`character-panel ${isOpen ? 'open' : ''}`}>
      <div className="character-header">
        <h2>Character Stats</h2>
        <button className="close-button" onClick={onClose} title="Close character sheet">
          ✕
        </button>
      </div>

      <div className="character-content">
        {loading && <div className="character-status">Loading stats...</div>}
        {error && <div className="character-error">Error: {error}</div>}

        {!loading && (
          <>
            <div className="stats-row">
              <div className="stats-grid">
                {statConfig.map(({ key, label, short }) => (
                  <StatInput
                    key={key}
                    label={label}
                    shortLabel={short}
                    value={stats[key]}
                    onChange={(value) => updateStat(key, value)}
                  />
                ))}
              </div>
              <div className="stats-divider" />
              <LevelInput
                level={stats.level}
                onChange={(value) => updateStat('level', value)}
              />
            </div>

            {/* Skills Section */}
            <div className="skills-section">
              <div className="skills-section-title">Skills</div>
              <div className="skills-groups-container">
                {SKILL_GROUPS.map(({ ability, label }) => {
                  const groupSkills = SKILL_DEFINITIONS.filter(s => s.ability === ability)
                  if (groupSkills.length === 0) return null
                  const proficiencies = stats.skillProficiencies || DEFAULT_SKILL_PROFICIENCIES
                  return (
                    <div key={ability} className="skills-group">
                      <div className="skills-group-header">{label}</div>
                      {groupSkills.map(skill => {
                        const current = proficiencies[skill.key]
                        return (
                          <div key={skill.key} className="skill-row">
                            <span className="skill-name">{skill.label}</span>
                            <div className="skill-radio-group">
                              <button
                                className={`skill-radio prof ${current === 'proficient' ? 'active' : ''}`}
                                onClick={() => updateSkillProficiency(skill.key, current === 'proficient' ? 'none' : 'proficient')}
                                title="Proficient"
                              >P</button>
                              <button
                                className={`skill-radio expert ${current === 'expert' ? 'active' : ''}`}
                                onClick={() => updateSkillProficiency(skill.key, current === 'expert' ? 'none' : 'expert')}
                                title="Expert"
                              >E</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="character-footer">
              <button
                className="reset-stats-button"
                onClick={() => setShowResetModal(true)}
              >
                Reset to Default
              </button>
            </div>
          </>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reset Stats?</h3>
            <p>Are you sure you want to reset all stats to 10?</p>
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={() => setShowResetModal(false)}>
                Cancel
              </button>
              <button className="modal-confirm" onClick={handleResetStats}>
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
