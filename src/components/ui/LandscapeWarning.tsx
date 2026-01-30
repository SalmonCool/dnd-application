/**
 * LandscapeWarning Component
 * ==========================
 * Full-screen overlay that appears when device is in landscape mode
 * Advises user to rotate back to portrait
 */

import { useState, useEffect } from 'react'

export default function LandscapeWarning() {
  const [isLandscape, setIsLandscape] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkOrientation = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 900
      const isLandscapeMode = window.innerWidth > window.innerHeight

      setIsMobile(isTouchDevice && isSmallScreen)
      setIsLandscape(isLandscapeMode)
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  // Only show on mobile devices in landscape
  if (!isMobile || !isLandscape) {
    return null
  }

  return (
    <div className="landscape-warning">
      <div className="landscape-warning-content">
        <div className="landscape-warning-icon">📱</div>
        <h2>Please Rotate Your Device</h2>
        <p>This app works best in portrait mode.</p>
        <div className="landscape-warning-arrow">↻</div>
      </div>
    </div>
  )
}
