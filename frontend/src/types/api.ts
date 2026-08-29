/**
 * Mirrors the JSON contract documented in docs/backend.md.
 *
 * Two separate "cases" coexist deliberately: the album/library/track
 * endpoints are camelCase (the frontend's own contract, unchanged since
 * the original localStorage app); the Spotify search/detail endpoints are
 * snake_case (Spotify's own shape, passed through by _normalize_album with
 * minimal reshaping). Don't "fix" one to match the other — see backend.md.
 */

export interface Track {
  trackNumber: number
  title: string
  durationMs: number
  spotifyUri: string
}

export interface Album {
  id: string
  title: string
  artist: string
  year: number
  genre: string
  country: string
  label: string
  cover: string
  coverFile: string
  spotifyUri: string
  tags: string[]
  tracks: Track[]
  favorite: boolean
  addedAt: number
}

export interface Library {
  id: string
  name: string
  description: string
  color: string
  createdAt: number
  albums: Album[]
}

export interface VaultState {
  libraries: Library[]
}

export interface AlbumPayload {
  title: string
  artist: string
  year: number
  genre: string
  country: string
  label?: string
  cover?: string
  spotifyUri?: string
  tags?: string[]
  tracks?: Track[]
  downloadCover?: boolean
}

export interface LibraryPayload {
  name: string
  description?: string
  color?: string
}

// --- Spotify (client-credentials search/autofill) — snake_case, Spotify's
// own shape, distinct from the album/library contract above.

export interface SpotifyTrack {
  track_number: number
  title: string
  duration_ms: number
  spotify_uri: string
}

export interface SpotifySearchResult {
  spotify_id: string
  spotify_uri: string
  name: string
  artists: string[]
  release_date: string
  total_tracks: number
  cover_url: string | null
  external_url: string | null
  album_type: string
  label: string
  genres: string[]
  tracks: SpotifyTrack[]
}

export interface SpotifyStatus {
  connected: boolean
}

export interface ApiError {
  error: string
  code?: string
}
