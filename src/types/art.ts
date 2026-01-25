/**
 * Art Item Type Definitions
 * =========================
 * Types for the art channel feature
 */

export interface ArtItem {
  id: string
  imageUrl: string
  description?: string
  addedBy: string
  addedAt: number
}
