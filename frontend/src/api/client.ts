import type {
  Album,
  AlbumPayload,
  Library,
  LibraryPayload,
  NowPlaying,
  SpotifySearchResult,
  SpotifyStatus,
  VaultState,
} from '../types/api'

declare global {
  interface Window {
    MV_BASE?: string
    // Auth URLs live at the host project's level (django.contrib.auth.urls,
    // usually under accounts/), not under music_vault's own url namespace,
    // so the Django template injects the real one rather than us guessing it.
    MV_LOGOUT_URL?: string
  }
}

const VAULT_BASE = window.MV_BASE || '/'
const API_BASE = `${VAULT_BASE}api/`
export const SPOTIFY_CONNECT_URL = `${VAULT_BASE}spotify/connect/`
export const LOGOUT_URL = window.MV_LOGOUT_URL || '/accounts/logout/'

export function getCookie(name: string): string {
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`))
      ?.split('=')[1] ?? ''
  )
}

class ApiRequestError extends Error {}

/** Same contract as the original script.js's api(): reload on 401 (session
 * expired), extract {error} on failure, null body on 204. */
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
    body: body !== undefined ? JSON.stringify(body) : null,
  })
  if (res.status === 401) {
    location.reload()
    throw new ApiRequestError('Signed out — reloading')
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      message = data.error || message
    } catch {
      /* non-JSON error body */
    }
    throw new ApiRequestError(message)
  }
  return res.status === 204 ? (null as T) : ((await res.json()) as T)
}

export const getState = () => api<VaultState>('state/')

export const createLibrary = (payload: LibraryPayload) => api<Library>('libraries/', 'POST', payload)
export const updateLibrary = (id: string, payload: LibraryPayload) =>
  api<Library>(`libraries/${id}/`, 'PUT', payload)
export const deleteLibrary = (id: string) => api<null>(`libraries/${id}/`, 'DELETE')

export const createAlbum = (libraryId: string, payload: AlbumPayload) =>
  api<Album>(`libraries/${libraryId}/albums/`, 'POST', payload)
export const updateAlbum = (id: string, payload: AlbumPayload) => api<Album>(`albums/${id}/`, 'PUT', payload)
export const deleteAlbum = (id: string) => api<null>(`albums/${id}/`, 'DELETE')
export const toggleFavorite = (id: string) => api<Album>(`albums/${id}/favorite/`, 'POST')
export const playAlbum = (id: string, trackUri?: string) =>
  api<{ playing: true }>(`albums/${id}/play/`, 'POST', trackUri ? { trackUri } : undefined)

export const importBackup = (data: VaultState) => api<VaultState>('import/', 'POST', data)

export const spotifySearch = (query: string, limit = 20) =>
  api<{ results: SpotifySearchResult[] }>(`spotify/search/?q=${encodeURIComponent(query)}&limit=${limit}`)
export const spotifyAlbumDetail = (spotifyId: string) =>
  api<SpotifySearchResult>(`spotify/albums/${encodeURIComponent(spotifyId)}/`)
export const spotifyStatus = () => api<SpotifyStatus>('spotify/status/')
export const spotifyDisconnect = () => api<SpotifyStatus>('spotify/disconnect/', 'POST')
export const spotifyNowPlaying = () => api<NowPlaying>('spotify/now-playing/')
