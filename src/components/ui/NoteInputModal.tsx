/**
 * NoteInputModal Component
 * ========================
 * Modal for entering text for a new 3D scene note
 */

import { useState } from 'react'
import type { FormEvent } from 'react'

interface NoteInputModalProps {
  position: { x: number; y: number; z: number }
  onSubmit: (text: string, color: string, imageUrl?: string) => void
  onClose: () => void
}

const NOTE_COLORS = [
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Pink', value: '#f48fb1' },
  { name: 'Blue', value: '#81d4fa' },
  { name: 'Green', value: '#a5d6a7' },
  { name: 'Orange', value: '#ffcc80' },
  { name: 'Purple', value: '#ce93d8' },
]

export default function NoteInputModal({ position, onSubmit, onClose }: NoteInputModalProps) {
  const [text, setText] = useState('')
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].value)
  const [imageUrl, setImageUrl] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onSubmit(text.trim(), selectedColor, imageUrl.trim() || undefined)
    }
  }

  return (
    <div className="note-input-overlay" onClick={onClose}>
      <div className="note-input-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add Scene Note</h3>
        <p className="note-position-info">
          Position: ({position.x.toFixed(1)}, {position.y.toFixed(1)})
        </p>
        
        <form onSubmit={handleSubmit}>
          <textarea
            className="note-textarea"
            placeholder="Enter your note text..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            autoFocus
          />
          
          <div className="note-color-picker">
            <label>Color:</label>
            <div className="color-options">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`color-option ${selectedColor === color.value ? 'selected' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="note-image-input">
            <label htmlFor="note-image-url">Image URL (optional):</label>
            <input
              id="note-image-url"
              type="url"
              className="note-image-url-input"
              placeholder="https://example.com/image.png"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className="note-modal-buttons">
            <button type="button" className="note-cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="note-submit-button" disabled={!text.trim()}>
              Add Note
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
