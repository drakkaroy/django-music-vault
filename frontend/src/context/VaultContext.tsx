import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getState, spotifyDisconnect, spotifyStatus } from '../api/client'
import type { VaultState } from '../types/api'

interface Toast {
  id: number
  message: string
  icon: string
}

interface VaultContextValue {
  state: VaultState
  loading: boolean
  spotifyConnected: boolean
  refreshState: () => Promise<void>
  disconnectSpotify: () => Promise<void>
  toasts: Toast[]
  pushToast: (message: string, icon?: string) => void
}

const VaultContext = createContext<VaultContextValue | null>(null)

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong'
}

/** Reads ?spotify=connected|denied|error|not_configured from the OAuth
 * callback redirect (see music_vault/views.py's spotify_callback), reports
 * it, and strips the query string — ported from handleSpotifyRedirect(). */
function readSpotifyRedirectStatus(): string | null {
  const params = new URLSearchParams(location.search)
  const status = params.get('spotify')
  if (status) history.replaceState({}, '', location.pathname)
  return status
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VaultState>({ username: '', libraries: [] })
  const [loading, setLoading] = useState(true)
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const pushToast = useCallback((message: string, icon = '✓') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message, icon }])
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 2600)
  }, [])

  const refreshState = useCallback(async () => {
    setState(await getState())
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refreshState()
        const status = await spotifyStatus()
        if (!cancelled) setSpotifyConnected(status.connected)
      } catch (err) {
        if (!cancelled) pushToast(errorMessage(err), '⚠')
      } finally {
        if (!cancelled) setLoading(false)
      }
      const redirectStatus = readSpotifyRedirectStatus()
      if (redirectStatus === 'connected') {
        if (!cancelled) setSpotifyConnected(true)
        pushToast('Spotify connected ✓', '🎧')
      } else if (redirectStatus === 'denied') {
        pushToast('Spotify connection cancelled', '⚠')
      } else if (redirectStatus === 'not_configured') {
        pushToast('Spotify is not configured on this server', '⚠')
      } else if (redirectStatus) {
        pushToast('Could not connect to Spotify — try again', '⚠')
      }
    })()
    return () => {
      cancelled = true
    }
    // refreshState/pushToast are stable (useCallback with no deps), so this
    // still only really runs once — matching the original boot IIFE.
  }, [refreshState, pushToast])

  const disconnectSpotify = useCallback(async () => {
    try {
      await spotifyDisconnect()
      setSpotifyConnected(false)
      pushToast('Spotify disconnected')
    } catch (err) {
      pushToast(errorMessage(err), '⚠')
    }
  }, [pushToast])

  return (
    <VaultContext.Provider
      value={{ state, loading, spotifyConnected, refreshState, disconnectSpotify, toasts, pushToast }}
    >
      {children}
    </VaultContext.Provider>
  )
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within a VaultProvider')
  return ctx
}
