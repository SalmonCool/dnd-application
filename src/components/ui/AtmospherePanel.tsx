/**
 * AtmospherePanel Component
 * =========================
 * Slide-in panel for selecting atmosphere on mobile
 */

import type { AtmosphereType } from '../../hooks/useAtmosphere'

interface AtmospherePanelProps {
  isOpen: boolean
  onClose: () => void
  atmosphere: AtmosphereType
  onAtmosphereSelect: (atmosphere: AtmosphereType) => void
}

export default function AtmospherePanel({
  isOpen,
  onClose,
  atmosphere,
  onAtmosphereSelect,
}: AtmospherePanelProps) {
  const handleSelect = (e: React.MouseEvent, value: AtmosphereType) => {
    e.stopPropagation()
    e.preventDefault()
    // Toggle off if already selected
    onAtmosphereSelect(atmosphere === value ? 'none' : value)
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
        <h2>Atmosphere</h2>
        <button className="close-button" onClick={onClose} title="Close panel">
          ✕
        </button>
      </div>

      <div className="dice-select-content">
        <div className="dice-select-section">
          <h3>Select Atmosphere</h3>
          <div className="dice-select-grid">
            <button
              className={`dice-select-item ${atmosphere === 'winter' ? 'selected' : ''}`}
              onClick={(e) => handleSelect(e, 'winter')}
            >
              <span className="dice-select-icon">❄</span>
              <span className="dice-select-label">Winter</span>
            </button>
            <button
              className={`dice-select-item ${atmosphere === 'ember' ? 'selected' : ''}`}
              onClick={(e) => handleSelect(e, 'ember')}
            >
              <span className="dice-select-icon">🔥</span>
              <span className="dice-select-label">Ember</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
