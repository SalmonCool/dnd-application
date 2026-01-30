/**
 * DiceSelectPanel Component
 * =========================
 * Slide-in panel for selecting dice type and artifacts on mobile
 */

type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20'
type SelectionType = DiceType | 'artifacts'
type ArtifactType = 'orb' | 'skull' | null

interface DiceSelectPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedDice: SelectionType | null
  selectedArtifact: ArtifactType
  onDiceSelect: (dice: DiceType) => void
  onArtifactSelect: (artifact: ArtifactType) => void
}

export default function DiceSelectPanel({
  isOpen,
  onClose,
  selectedDice,
  selectedArtifact,
  onDiceSelect,
  onArtifactSelect,
}: DiceSelectPanelProps) {
  const handleDiceClick = (e: React.MouseEvent, dice: DiceType) => {
    e.stopPropagation()
    e.preventDefault()
    onDiceSelect(dice)
    onClose()
  }

  const handleArtifactClick = (e: React.MouseEvent, artifact: ArtifactType) => {
    e.stopPropagation()
    e.preventDefault()
    onArtifactSelect(artifact)
    onClose()
  }

  // Prevent touch events from propagating to 3D scene
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className={`dice-select-panel ${isOpen ? 'open' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchStart}
      onTouchMove={handleTouchStart}
    >
      <div className="dice-select-header">
        <h2>Select Dice or Artifact</h2>
        <button className="close-button" onClick={onClose} title="Close panel">
          ✕
        </button>
      </div>

      <div className="dice-select-content">
        {/* Artifacts Section */}
        <div className="dice-select-section">
          <h3>Artifacts</h3>
          <div className="dice-select-grid">
            <button
              className={`dice-select-item ${selectedDice === 'artifacts' && selectedArtifact === 'orb' ? 'selected' : ''}`}
              onClick={(e) => handleArtifactClick(e, 'orb')}
            >
              <span className="dice-select-icon">🔮</span>
              <span className="dice-select-label">Orb of Oddlings</span>
            </button>
            <button
              className={`dice-select-item ${selectedDice === 'artifacts' && selectedArtifact === 'skull' ? 'selected' : ''}`}
              onClick={(e) => handleArtifactClick(e, 'skull')}
            >
              <span className="dice-select-icon">💀</span>
              <span className="dice-select-label">Skull of Chattering</span>
            </button>
            <button
              className={`dice-select-item ${selectedDice === 'artifacts' && selectedArtifact === null ? 'selected' : ''}`}
              onClick={(e) => handleArtifactClick(e, null)}
            >
              <span className="dice-select-icon">👻</span>
              <span className="dice-select-label">Cloak of Invisibility</span>
            </button>
          </div>
        </div>

        {/* Dice Section */}
        <div className="dice-select-section">
          <h3>Dice</h3>
          <div className="dice-select-grid">
            {(['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as DiceType[]).map((dice) => (
              <button
                key={dice}
                className={`dice-select-item ${selectedDice === dice ? 'selected' : ''}`}
                onClick={(e) => handleDiceClick(e, dice)}
              >
                <span className="dice-select-icon">🎲</span>
                <span className="dice-select-label">{dice.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
