/**
 * MobileMenu Component
 * ====================
 * Hamburger menu for mobile devices with header actions
 */

import { useState } from 'react'

interface MobileMenuProps {
  onNewSession: () => void
  onResetStream: () => void
  onResetMusicLead: () => void
  onLogout: () => void
}

export default function MobileMenu({
  onNewSession,
  onResetStream,
  onResetMusicLead,
  onLogout,
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  return (
    <div className="mobile-menu">
      <button
        className="mobile-menu-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
      >
        <span className={`hamburger ${isOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {isOpen && (
        <div className="mobile-menu-overlay" onClick={() => setIsOpen(false)}>
          <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="mobile-menu-item"
              onClick={() => handleAction(onNewSession)}
            >
              🆕 New Session
            </button>
            <button
              className="mobile-menu-item"
              onClick={() => handleAction(onResetStream)}
            >
              📺 Reset Stream
            </button>
            <button
              className="mobile-menu-item"
              onClick={() => handleAction(onResetMusicLead)}
            >
              🎵 Reset Music Lead
            </button>
            <div className="mobile-menu-divider" />
            <button
              className="mobile-menu-item logout"
              onClick={() => handleAction(onLogout)}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
