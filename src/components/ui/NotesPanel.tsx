/**
 * NotesPanel Component
 * ====================
 * Full-screen note-taking panel with pages stored per user
 */

import { useState, useEffect, useRef } from 'react'
import { useNotes } from '../../hooks/useNotes'
import type { NotePage } from '../../types/notes'

const USERNAME_KEY = 'dnd_chat_username'

interface NotesPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotesPanel({ isOpen, onClose }: NotesPanelProps) {
  const [username] = useState<string | null>(() => localStorage.getItem(USERNAME_KEY))
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [titleInput, setTitleInput] = useState('')
  const [contentInput, setContentInput] = useState('')
  const [showNewPageInput, setShowNewPageInput] = useState(false)
  const [newPageTitle, setNewPageTitle] = useState('')

  const contentRef = useRef<HTMLTextAreaElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { pages, loading, error, createPage, updatePageTitle, updatePageContent, deletePage } = useNotes(username)

  // Get selected page
  const selectedPage = pages.find(p => p.id === selectedPageId) || null

  // Update content input when selected page changes
  useEffect(() => {
    if (selectedPage) {
      setContentInput(selectedPage.content)
    } else {
      setContentInput('')
    }
  }, [selectedPage])

  // Auto-save content with debounce
  useEffect(() => {
    if (!selectedPageId || !selectedPage) return

    // Don't save if content hasn't changed
    if (contentInput === selectedPage.content) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      updatePageContent(selectedPageId, contentInput)
    }, 1000) // Save after 1 second of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [contentInput, selectedPageId, selectedPage, updatePageContent])

  const handleCreatePage = async () => {
    if (!newPageTitle.trim()) return

    try {
      const newPageId = await createPage(newPageTitle.trim())
      if (newPageId) {
        setSelectedPageId(newPageId)
      }
      setNewPageTitle('')
      setShowNewPageInput(false)
    } catch (err) {
      console.error('Failed to create page:', err)
    }
  }

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return

    try {
      await deletePage(pageId)
      if (selectedPageId === pageId) {
        setSelectedPageId(null)
      }
    } catch (err) {
      console.error('Failed to delete page:', err)
    }
  }

  const handleStartEditTitle = (page: NotePage) => {
    setEditingTitle(page.id)
    setTitleInput(page.title)
  }

  const handleSaveTitle = async (pageId: string) => {
    if (titleInput.trim()) {
      await updatePageTitle(pageId, titleInput.trim())
    }
    setEditingTitle(null)
  }

  const handleKeyDownTitle = (e: React.KeyboardEvent, pageId: string) => {
    if (e.key === 'Enter') {
      handleSaveTitle(pageId)
    } else if (e.key === 'Escape') {
      setEditingTitle(null)
    }
  }

  if (!username) {
    return (
      <div className={`notes-panel ${isOpen ? 'open' : ''}`}>
        <div className="notes-login-required">
          <p>Please log in to use notes.</p>
          <button className="notes-close-button" onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`notes-panel ${isOpen ? 'open' : ''}`}>
      {/* Notes Header */}
      <div className="notes-header">
        <h2>Notes</h2>
        <button className="close-button" onClick={onClose} title="Close notes">
          ✕
        </button>
      </div>

      <div className="notes-container">
        {/* Pages Sidebar */}
        <div className="notes-sidebar">
          <div className="notes-sidebar-header">
            <span>Pages</span>
            <button
              className="notes-add-page-btn"
              onClick={() => setShowNewPageInput(true)}
              title="Create new page"
            >
              +
            </button>
          </div>

          {/* New Page Input */}
          {showNewPageInput && (
            <div className="notes-new-page-input">
              <input
                type="text"
                placeholder="Page name..."
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePage()
                  if (e.key === 'Escape') setShowNewPageInput(false)
                }}
                autoFocus
              />
              <button onClick={handleCreatePage} disabled={!newPageTitle.trim()}>
                Create
              </button>
              <button onClick={() => setShowNewPageInput(false)}>
                Cancel
              </button>
            </div>
          )}

          {/* Pages List */}
          <div className="notes-pages-list">
            {loading && <div className="notes-status">Loading...</div>}
            {error && <div className="notes-error">{error}</div>}
            {!loading && pages.length === 0 && (
              <div className="notes-status">No pages yet. Create one!</div>
            )}
            {pages.map((page) => (
              <div
                key={page.id}
                className={`notes-page-item ${selectedPageId === page.id ? 'selected' : ''}`}
                onClick={() => setSelectedPageId(page.id)}
              >
                {editingTitle === page.id ? (
                  <input
                    type="text"
                    className="notes-title-edit"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onBlur={() => handleSaveTitle(page.id)}
                    onKeyDown={(e) => handleKeyDownTitle(e, page.id)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span
                    className="notes-page-title"
                    onDoubleClick={() => handleStartEditTitle(page)}
                  >
                    {page.title}
                  </span>
                )}
                <button
                  className="notes-delete-page-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeletePage(page.id)
                  }}
                  title="Delete page"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notes Content Area */}
        <div className="notes-content">
          {selectedPage ? (
            <>
              <div className="notes-content-header">
                <h3>{selectedPage.title}</h3>
                <span className="notes-last-updated">
                  Last updated: {new Date(selectedPage.updatedAt).toLocaleString()}
                </span>
              </div>
              <textarea
                ref={contentRef}
                className="notes-editor"
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                placeholder="Start writing your notes..."
              />
            </>
          ) : (
            <div className="notes-no-selection">
              <p>Select a page or create a new one to start taking notes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
