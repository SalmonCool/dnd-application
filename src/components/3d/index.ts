/**
 * index.ts - Barrel Export File
 * ==============================
 * This file re-exports components from the 3d folder, making imports cleaner.
 *
 * BARREL EXPORT PATTERN:
 * ----------------------
 * Instead of importing from specific files:
 *   import Scene from './components/3d/Scene'
 *   import D20Dice from './components/3d/D20Dice'
 *
 * You can import from the folder (which uses this index.ts):
 *   import { Scene, D20Dice } from './components/3d'
 *
 * BENEFITS:
 * - Cleaner import statements
 * - Encapsulation (you can reorganize files without changing imports elsewhere)
 * - Control over what's "public" from this folder
 *
 * SYNTAX EXPLANATION:
 * export { default as Scene } from './Scene'
 *
 * This does two things in one line:
 * 1. Imports the default export from './Scene'
 * 2. Re-exports it as a named export called 'Scene'
 *
 * Without this shorthand, you'd write:
 *   import Scene from './Scene'
 *   export { Scene }
 */

// Re-export Scene component as a named export
export { default as Scene } from './Scene'

// Re-export D20Dice component as a named export
export { default as D20Dice } from './D20Dice'

// Re-export D6Dice component as a named export
export { default as D6Dice } from './D6Dice'
