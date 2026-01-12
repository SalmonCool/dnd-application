/**
 * ChatMessage Component
 * =====================
 * Displays an individual chat message with timestamp
 */

import type { ChatMessage as ChatMessageType } from '../../types/chat'

interface ChatMessageProps {
  message: ChatMessageType
}

export default function ChatMessage({ message }: ChatMessageProps) {
  // Format timestamp to readable time
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // Apply different styling based on message type
  const messageClass = `chat-message ${
    message.type === 'dice_roll' ? 'dice-roll-message' :
    message.type === 'multiplier' ? 'multiplier-message' : ''
  }`

  return (
    <div className={messageClass}>
      <div className="message-header">
        <span className="message-username">{message.username}</span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
      <span className="message-text">
        {message.type === 'dice_roll' && message.result && (
          <span className="dice-result">🎲 {message.result} </span>
        )}
        {message.type === 'multiplier' && message.result && (
          <span className="multiplier-result">✨ {message.result} </span>
        )}
        {message.text}
      </span>
    </div>
  )
}
