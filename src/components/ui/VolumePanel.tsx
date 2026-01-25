/**
 * VolumePanel Component
 * =====================
 * Slide-in panel for controlling audio volumes
 */

import { useVolume } from '../../hooks/useVolume'
import type { VolumeSettings } from '../../hooks/useVolume'

interface VolumePanelProps {
  isOpen: boolean
  onClose: () => void
}

interface VolumeSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  icon: string
  isMaster?: boolean
}

function VolumeSlider({ label, value, onChange, icon, isMaster }: VolumeSliderProps) {
  return (
    <div className={`volume-slider-group ${isMaster ? 'master' : ''}`}>
      <div className="volume-slider-header">
        <span className="volume-icon">{icon}</span>
        <span className="volume-label">{label}</span>
        <span className="volume-value">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="volume-slider"
      />
    </div>
  )
}

export default function VolumePanel({ isOpen, onClose }: VolumePanelProps) {
  const { volumes, setVolume } = useVolume()

  const handleVolumeChange = (type: keyof VolumeSettings) => (value: number) => {
    setVolume(type, value)
  }

  return (
    <div className={`volume-panel ${isOpen ? 'open' : ''}`}>
      <div className="volume-header">
        <h2>Volume</h2>
        <button className="close-button" onClick={onClose} title="Close volume panel">
          ✕
        </button>
      </div>

      <div className="volume-controls">
        <VolumeSlider
          label="Master Volume"
          value={volumes.master}
          onChange={handleVolumeChange('master')}
          icon="🔊"
          isMaster
        />

        <div className="volume-divider" />

        <VolumeSlider
          label="Stream"
          value={volumes.stream}
          onChange={handleVolumeChange('stream')}
          icon="📺"
        />

        <VolumeSlider
          label="Music"
          value={volumes.music}
          onChange={handleVolumeChange('music')}
          icon="🎵"
        />

        <VolumeSlider
          label="Dice"
          value={volumes.dice}
          onChange={handleVolumeChange('dice')}
          icon="🎲"
        />

        <VolumeSlider
          label="Spells"
          value={volumes.spells}
          onChange={handleVolumeChange('spells')}
          icon="📖"
        />
      </div>
    </div>
  )
}
