/**
 * ChatPanel Component
 * ===================
 * Slide-in chat panel with real-time message synchronization
 */

import { useState, useRef, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useChat } from '../../hooks/useChat'
import { useAuth } from '../../hooks/useAuth'
import ChatMessage from './ChatMessage'
import UsernamePrompt from './UsernamePrompt'

const USERNAME_KEY = 'dnd_chat_username'

// Debug logging - set VITE_DEBUG_CHATPANEL =true in .env to enable
const DEBUG_CHATPANEL = import.meta.env.VITE_DEBUG_CHATPANEL === 'true'

// Debug logger helper - only logs when DEBUG_WEBCHATPANEL is true
const debugLog = (message: string, ...args: any[]) => {
  if (DEBUG_CHATPANEL) {
    console.log(message, ...args)
  }
}

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
  onDiceRoll?: (diceType: string, result: number) => void
  onMultiplier?: (multiplier: number, newValue: number) => void
}

export default function ChatPanel({ isOpen, onClose, onDiceRoll: _onDiceRoll, onMultiplier: _onMultiplier }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('')
  const [username, setUsername] = useState<string | null>(() => {
    // Initialize username from localStorage
    return localStorage.getItem(USERNAME_KEY)
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, loading, error, sendMessage, sendDiceRoll, sendMultiplier, sendSpellCast, sendRollModifier, clearMessages } = useChat()
  const { isAuthenticated, verifyPassword, logout, error: authError, isFirstTimeSetup } = useAuth()

  // Expose sendDiceRoll to parent via useEffect
  useEffect(() => {
    if (username) {
      debugLog('🔧 Setting up window functions with username:', username);

      // Store the function for parent to call
      (window as any).__sendDiceRoll = (diceType: string, result: number) => {
        debugLog('🎯 window.__sendDiceRoll intercepted:', { diceType, result })
        sendDiceRoll(username, diceType, result)
      }

      (window as any).__sendMultiplier = (multiplier: number, newValue: number) => {
        debugLog('🎯 window.__sendMultiplier intercepted:', { multiplier, newValue })
        sendMultiplier(username, multiplier, newValue)
      }

      ;(window as any).__sendSpellCast = (spellName: string, diceNotation: string, total: number, description?: string) => {
        debugLog('🎯 window.__sendSpellCast intercepted:', { spellName, diceNotation, total, description })
        sendSpellCast(username, spellName, diceNotation, total, description)
      }

      ;(window as any).__sendRollModifier = (flatMod: number, bonusDie: string | null, bonusDieResult: number | null, newTotal: number) => {
        debugLog('🎯 window.__sendRollModifier intercepted:', { flatMod, bonusDie, bonusDieResult, newTotal })
        sendRollModifier(username, flatMod, bonusDie, bonusDieResult, newTotal)
      }

      debugLog('✅ Window functions registered')
    } else {
      debugLog('⚠️ Username not set yet, window functions not registered')
    }

    // Expose clearMessages and logout regardless of username state
    (window as any).__clearMessages = () => {
      debugLog('🗑️ Clearing all messages')
      clearMessages()
    }

    (window as any).__logout = () => {
      debugLog('🚪 Logging out')
      logout()
      localStorage.removeItem(USERNAME_KEY)
      setUsername(null)
    }
  }, [username, sendDiceRoll, sendMultiplier, sendSpellCast, sendRollModifier, clearMessages, logout])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Notify parent of message count changes
  useEffect(() => {
    // Store current count on window for App.tsx to access
    window.__currentMessageCount = messages.length

    if (window.__onMessageCountChange) {
      window.__onMessageCountChange(messages.length)
    }
  }, [messages.length])

  // Also notify when chat panel opens/closes
  useEffect(() => {
    if (window.__onChatOpenChange) {
      window.__onChatOpenChange(isOpen, messages.length)
    }
  }, [isOpen, messages.length])

  const handleUsernameSubmit = async (newUsername: string, password: string) => {
    // Verify password first
    const isValid = await verifyPassword(password)

    if (isValid) {
      // Only set username if password is correct
      localStorage.setItem(USERNAME_KEY, newUsername)
      setUsername(newUsername)
    }
    // If password is wrong, useAuth hook will set the error state
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && username) {
      await sendMessage(inputValue, username)
      setInputValue('')
    }
  }

  // Show username prompt if not authenticated or no username is set
  if (!isAuthenticated || !username) {
    return (
      <UsernamePrompt
        onSubmit={handleUsernameSubmit}
        isFirstTimeSetup={isFirstTimeSetup}
        errorMessage={authError}
      />
    )
  }

  return (
    <div className={`chat-panel ${isOpen ? 'open' : ''}`}>
      <div className="chat-header">
        <h2>Party Chat</h2>
        <button className="close-button" onClick={onClose} title="Close chat">
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {loading && <div className="chat-status">Loading messages...</div>}
        {error && <div className="chat-error">Error: {error}</div>}
        {!loading && messages.length === 0 && (
          <div className="chat-status">No messages yet. Start chatting!</div>
        )}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          maxLength={500}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!inputValue.trim()}
        >
          Send
        </button>
      </form>
    </div>
  )
}
