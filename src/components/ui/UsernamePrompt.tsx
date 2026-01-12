/**
 * UsernamePrompt Component
 * ========================
 * Modal prompt for users to set their username and authenticate
 */

import { useState } from 'react'
import type { FormEvent } from 'react'

interface UsernamePromptProps {
  onSubmit: (username: string, password: string) => void
  isFirstTimeSetup: boolean
  errorMessage?: string | null
}

export default function UsernamePrompt({ onSubmit, isFirstTimeSetup, errorMessage }: UsernamePromptProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (username.trim() && password.trim()) {
      onSubmit(username.trim(), password.trim())
    }
  }

  return (
    <div className="username-prompt-overlay">
      <div className="username-prompt-modal">
        <h2>Welcome to the Party!</h2>
        <p>
          {isFirstTimeSetup
            ? 'Set your username and create the application password:'
            : 'Enter your username and password:'}
        </p>
        {errorMessage && <div className="auth-error">{errorMessage}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="username-input"
            placeholder="Enter username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <input
            type="password"
            className="username-input"
            placeholder={isFirstTimeSetup ? "Create password..." : "Enter password..."}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={50}
          />
          <button
            type="submit"
            className="username-submit-button"
            disabled={!username.trim() || !password.trim()}
          >
            {isFirstTimeSetup ? 'Create Session' : 'Join Session'}
          </button>
        </form>
      </div>
    </div>
  )
}
