/**
 * Dagger Types
 * ============
 * Type definitions for 3D daggers stabbed into the scene
 */

export interface Dagger3D {
  id: string
  position: {
    x: number
    y: number
    z: number
  }
  createdBy: string
  createdAt: number
}

export interface DaggerInput {
  position: {
    x: number
    y: number
    z: number
  }
}
