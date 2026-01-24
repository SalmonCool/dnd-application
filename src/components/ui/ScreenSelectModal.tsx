/**
 * ScreenSelectModal Component
 * ============================
 * Modal for initiating screen sharing
 */

import type { FormEvent } from 'react'

interface ScreenSelectModalProps {
  onStartStream: () => void
  onClose: () => void
  error?: string | null
}

export default function ScreenSelectModal({ onStartStream, onClose, error }: ScreenSelectModalProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onStartStream()
  }

  return (
    <div className="screen-select-overlay">
      <div className="screen-select-modal">
        <h2>Start Screen Sharing</h2>
        <p>
          Your browser will prompt you to select which screen or window to share with the party.
        </p>
        {error && <div className="stream-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="modal-buttons">
            <button
              type="button"
              className="modal-cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-start-button"
            >
              Share Screen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
