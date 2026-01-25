/**
 * Firebase Configuration
 * ======================
 * Initializes Firebase Realtime Database for chat feature
 */

import { initializeApp } from 'firebase/app'
import { getDatabase, ref, push, set, remove, onValue, off, query, orderByChild } from 'firebase/database'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Get database reference
const database = getDatabase(app)

// Export database references and utilities
export { database, ref, push, set, remove, onValue, off, query, orderByChild }
