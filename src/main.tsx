/**
 * main.tsx - Application Entry Point
 * ===================================
 * This is the first TypeScript/React file that runs when the app starts.
 * It's responsible for mounting the React application to the DOM.
 *
 * LEARNING POINT: React doesn't replace your HTML - it renders INTO it.
 * In index.html, there's a <div id="root"></div> where React mounts.
 *
 * FILE EXTENSION: .tsx = TypeScript + JSX (React's HTML-like syntax)
 */

// React imports
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/**
 * CSS import
 * ----------
 * Importing CSS in JavaScript is a modern bundler feature (Vite/Webpack).
 * This CSS will be applied globally to the entire application.
 */
import './index.css'

/**
 * App Component Import
 * --------------------
 * This is the root component of our application.
 * All other components will be children of App.
 *
 * LEARNING POINT: In React, you build your UI as a tree of components.
 * App is at the top of that tree.
 */
import App from './App.tsx'

/**
 * createRoot & render
 * -------------------
 * createRoot() - Creates a React root for displaying content.
 *
 * document.getElementById('root')! - Gets the DOM element with id="root"
 *   - The '!' is TypeScript's non-null assertion operator
 *   - It tells TypeScript "trust me, this element exists"
 *
 * .render() - Renders the React component tree into the DOM
 */
createRoot(document.getElementById('root')!).render(
  /**
   * StrictMode
   * ----------
   * A development tool that:
   *   - Highlights potential problems in your app
   *   - Runs certain checks and warnings twice (to catch side effects)
   *   - Doesn't render any visible UI
   *   - Only activates in development mode (not production)
   *
   * LEARNING POINT: If you see things rendering twice in development,
   * that's StrictMode doing its job to help you find bugs!
   */
  <StrictMode>
    <App />
  </StrictMode>,
)
