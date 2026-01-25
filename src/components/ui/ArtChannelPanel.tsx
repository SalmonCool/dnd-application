/**
 * ArtChannelPanel Component
 * =========================
 * Gallery panel for sharing art via image URLs
 */

import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useArtChannel } from '../../hooks/useArtChannel'

declare global {
  interface Window {
    __clearArtChannel?: () => void
  }
}

interface ArtChannelPanelProps {
  username: string
}

export default function ArtChannelPanel({ username }: ArtChannelPanelProps) {
  const [imageUrl, setImageUrl] = useState('')
  const [description, setDescription] = useState('')
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const { items, loading, error, addItem, removeItem, clearAll, isValidImageUrl } = useArtChannel()

  // Expose clearAll on window for "Start New Session"
  useEffect(() => {
    window.__clearArtChannel = clearAll
    return () => {
      delete window.__clearArtChannel
    }
  }, [clearAll])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (imageUrl.trim() && isValidImageUrl(imageUrl)) {
      try {
        await addItem(imageUrl, description, username)
        setImageUrl('')
        setDescription('')
      } catch (err) {
        console.error('Failed to add art:', err)
      }
    }
  }

  const handleRemove = async (itemId: string) => {
    if (confirm('Remove this image from the gallery?')) {
      await removeItem(itemId)
    }
  }

  const isUrlValid = imageUrl.trim() === '' || isValidImageUrl(imageUrl)

  return (
    <div className="art-channel">
      {/* Art Gallery */}
      <div className="art-gallery">
        {loading && <div className="art-status">Loading gallery...</div>}
        {error && <div className="art-error">Error: {error}</div>}
        {!loading && items.length === 0 && (
          <div className="art-status">No art yet. Share an image URL below!</div>
        )}
        {items.map((item) => (
          <div key={item.id} className="art-item">
            <div className="art-image-container" onClick={() => setExpandedImage(item.imageUrl)}>
              <img
                src={item.imageUrl}
                alt={item.description || 'Shared art'}
                className="art-image"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23999" font-size="12">Image Error</text></svg>'
                }}
              />
            </div>
            <div className="art-info">
              <span className="art-author">{item.addedBy}</span>
              {item.description && (
                <p className="art-description">{item.description}</p>
              )}
              <button
                className="art-remove-button"
                onClick={() => handleRemove(item.id)}
                title="Remove from gallery"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Art Form */}
      <form className="art-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className={`art-url-input ${!isUrlValid ? 'invalid' : ''}`}
          placeholder="Image URL..."
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        {!isUrlValid && (
          <span className="art-url-error">Please enter a valid URL</span>
        )}
        <input
          type="text"
          className="art-description-input"
          placeholder="Description (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
        <button
          type="submit"
          className="art-submit-button"
          disabled={!imageUrl.trim() || !isUrlValid}
        >
          Share Art
        </button>
        <div className="art-upload-disclaimer">No support for direct image upload. Must use image URL.</div>
      </form>

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div className="art-modal-overlay" onClick={() => setExpandedImage(null)}>
          <div className="art-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={expandedImage} alt="Expanded view" className="art-modal-image" />
            <button className="art-modal-close" onClick={() => setExpandedImage(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
