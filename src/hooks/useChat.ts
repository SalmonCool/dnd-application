/**
 * useChat Hook
 * ============
 * Custom hook for real-time chat message synchronization with Firebase
 */

import { useState, useEffect } from 'react'
import { database, ref, push, remove, onValue, off } from '../config/firebase'
import type { ChatMessage } from '../types/chat'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const messagesRef = ref(database, 'messages')

    // Subscribe to real-time updates
    onValue(
      messagesRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          // Convert object to array and sort by timestamp
          const messageArray: ChatMessage[] = Object.entries(data).map(
            ([id, value]: [string, any]) => ({
              id,
              text: value.text,
              username: value.username || 'Anonymous',
              timestamp: value.timestamp,
              type: value.type || 'text',
              diceType: value.diceType,
              result: value.result,
            })
          )
          // Sort messages by timestamp (oldest first)
          messageArray.sort((a, b) => a.timestamp - b.timestamp)
          setMessages(messageArray)
        } else {
          setMessages([])
        }
        setLoading(false)
      },
      (err) => {
        console.error('Firebase error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    // Cleanup: unsubscribe when component unmounts
    return () => {
      off(messagesRef)
    }
  }, [])

  const sendMessage = async (text: string, username: string): Promise<void> => {
    if (!text.trim() || !username.trim()) return

    try {
      const messagesRef = ref(database, 'messages')
      await push(messagesRef, {
        type: 'text',
        text: text.trim(),
        username: username.trim(),
        timestamp: Date.now(),
      })
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    }
  }

  const sendDiceRoll = async (
    username: string,
    diceType: string,
    result: number
  ): Promise<void> => {
    console.log('📤 sendDiceRoll called with:', { username, diceType, result })

    if (!username.trim()) {
      console.warn('⚠️ sendDiceRoll: username is empty')
      return
    }

    try {
      const messagesRef = ref(database, 'messages')
      await push(messagesRef, {
        type: 'dice_roll',
        text: `rolled a ${diceType.toUpperCase()} and got ${result}!`,
        username: username.trim(),
        diceType,
        result,
        timestamp: Date.now(),
      })
      console.log('✅ Dice roll sent to Firebase successfully')
    } catch (err) {
      console.error('❌ Error sending dice roll:', err)
      setError(err instanceof Error ? err.message : 'Failed to send dice roll')
    }
  }

  const sendMultiplier = async (
    username: string,
    multiplier: number,
    newValue: number
  ): Promise<void> => {
    if (!username.trim()) return

    try {
      const messagesRef = ref(database, 'messages')
      await push(messagesRef, {
        type: 'multiplier',
        text: `multiplied by ${multiplier}x = ${newValue}`,
        username: username.trim(),
        result: newValue,
        timestamp: Date.now(),
      })
    } catch (err) {
      console.error('Error sending multiplier:', err)
      setError(err instanceof Error ? err.message : 'Failed to send multiplier')
    }
  }

  const clearMessages = async (): Promise<void> => {
    try {
      const messagesRef = ref(database, 'messages')
      await remove(messagesRef)
      console.log('✅ All messages cleared from database')
    } catch (err) {
      console.error('Error clearing messages:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear messages')
    }
  }

  const sendSpellCast = async (
    username: string,
    spellName: string,
    diceNotation: string,
    total: number,
    description?: string
  ): Promise<void> => {
    if (!username.trim()) return

    try {
      const messagesRef = ref(database, 'messages')
      let text = `cast ${spellName} and rolled ${diceNotation} = ${total}`
      if (description) {
        text += ` - ${description}`
      }

      await push(messagesRef, {
        type: 'spell_cast',
        text,
        username: username.trim(),
        spellName,
        diceNotation,
        result: total,
        description: description || null,
        timestamp: Date.now(),
      })
    } catch (err) {
      console.error('Error sending spell cast:', err)
      setError(err instanceof Error ? err.message : 'Failed to send spell cast')
    }
  }

  const sendRollModifier = async (
    username: string,
    flatModifier: number,
    bonusDie: string | null,
    bonusDieResult: number | null,
    newTotal: number
  ): Promise<void> => {
    if (!username.trim()) return

    try {
      const messagesRef = ref(database, 'messages')

      // Build the text description
      let text = 'added '
      const parts: string[] = []

      if (flatModifier !== 0) {
        parts.push(flatModifier > 0 ? `+${flatModifier}` : `${flatModifier}`)
      }

      if (bonusDie && bonusDieResult !== null) {
        parts.push(`${bonusDie.toUpperCase()} (${bonusDieResult})`)
      }

      text += parts.join(' and ') + ` = ${newTotal}`

      await push(messagesRef, {
        type: 'roll_modifier',
        text,
        username: username.trim(),
        flatModifier,
        bonusDie,
        bonusDieResult,
        result: newTotal,
        timestamp: Date.now(),
      })
    } catch (err) {
      console.error('Error sending roll modifier:', err)
      setError(err instanceof Error ? err.message : 'Failed to send roll modifier')
    }
  }

  return { messages, loading, error, sendMessage, sendDiceRoll, sendMultiplier, sendSpellCast, sendRollModifier, clearMessages }
}
