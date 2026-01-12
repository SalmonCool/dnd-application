/**
 * useAuth Hook
 * ============
 * Custom hook for password authentication with Firebase
 */

import { useState, useEffect } from 'react'
import { database, ref, onValue, set } from '../config/firebase'
import bcrypt from 'bcryptjs'

const PASSWORD_PATH = 'config/appPassword'

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hashedPassword, setHashedPassword] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load hashed password from Firebase
  useEffect(() => {
    const passwordRef = ref(database, PASSWORD_PATH)

    const unsubscribe = onValue(
      passwordRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data && data.hash) {
          setHashedPassword(data.hash)
        }
        setLoading(false)
      },
      (err) => {
        console.error('Error loading password:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  /**
   * Verify password against stored hash
   */
  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!password.trim()) {
      setError('Password cannot be empty')
      return false
    }

    // If no password exists in database, this is first setup
    if (!hashedPassword) {
      await setMasterPassword(password)
      setIsAuthenticated(true)
      return true
    }

    // Verify password against stored hash
    try {
      const isValid = await bcrypt.compare(password, hashedPassword)
      if (isValid) {
        setIsAuthenticated(true)
        setError(null)
        return true
      } else {
        setError('Invalid password')
        return false
      }
    } catch (err) {
      console.error('Error verifying password:', err)
      setError('Error verifying password')
      return false
    }
  }

  /**
   * Set the master password (first time setup)
   */
  const setMasterPassword = async (password: string): Promise<void> => {
    try {
      // Hash the password with bcrypt (10 salt rounds)
      const hash = await bcrypt.hash(password, 10)

      // Store in Firebase
      const passwordRef = ref(database, PASSWORD_PATH)
      await set(passwordRef, {
        hash,
        createdAt: Date.now(),
      })

      setHashedPassword(hash)
      console.log('✅ Master password set successfully')
    } catch (err) {
      console.error('Error setting password:', err)
      setError('Failed to set password')
      throw err
    }
  }

  /**
   * Logout
   */
  const logout = () => {
    setIsAuthenticated(false)
  }

  return {
    isAuthenticated,
    loading,
    error,
    verifyPassword,
    logout,
    isFirstTimeSetup: !hashedPassword,
  }
}
