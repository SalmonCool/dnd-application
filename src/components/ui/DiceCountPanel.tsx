/**
 * DiceCountPanel Component
 * ========================
 * Slide-in panel for selecting how many dice to roll on mobile
 */

type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20'

interface DiceCountPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedDice: DiceType | null
  diceCount: number
  onCountSelect: (count: number) => void
}

export default function DiceCountPanel({
  isOpen,
  onClose,
  selectedDice,
  diceCount,
  onCountSelect,
}: DiceCountPanelProps) {
  const handleCountClick = (e: React.MouseEvent, count: number) => {
    e.stopPropagation()
    e.preventDefault()
    onCountSelect(count)
    onClose()
  }

  // Prevent touch events from propagating to 3D scene
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className={`dice-count-panel ${isOpen ? 'open' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchStart}
      onTouchMove={handleTouchStart}
    >
      <div className="dice-count-header">
        <h2>How Many {selectedDice?.toUpperCase() || 'Dice'}?</h2>
        <button className="close-button" onClick={onClose} title="Close panel">
          ✕
        </button>
      </div>

      <div className="dice-count-content">
        <p className="dice-count-description">
          Select how many dice to roll at once
        </p>
        <div className="dice-count-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              className={`dice-count-item ${diceCount === n ? 'selected' : ''}`}
              onClick={(e) => handleCountClick(e, n)}
            >
              <span className="dice-count-number">{n}</span>
              <span className="dice-count-label">
                {n === 1 ? 'die' : 'dice'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
