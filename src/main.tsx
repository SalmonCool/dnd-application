/*
 * main.tsx - Application Entry Point
 * ===================================
 */

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * createRoot & render
 */
createRoot(document.getElementById('root')!).render(
  <App />
)
