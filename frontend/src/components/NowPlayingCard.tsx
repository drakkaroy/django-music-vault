import { useEffect, useState } from 'react'
import { spotifyNowPlaying } from '../api/client'
import type { NowPlaying } from '../types/api'
import './NowPlayingCard.css'

const POLL_MS = 12000

interface NowPlayingCardProps {
  connected: boolean
}

/** Polls Spotify's playback state while connected and only when the tab is
 * visible — a self-contained card, not global state, since only the
 * sidebar needs it. Renders nothing when disconnected or nothing is
 * actively playing (paused counts as nothing, matching what "now playing"
 * should mean here). */
export function NowPlayingCard({ connected }: NowPlayingCardProps) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)

  useEffect(() => {
    if (!connected) return
    let cancelled = false
    const poll = async () => {
      try {
        const data = await spotifyNowPlaying()
        if (!cancelled) setNowPlaying(data)
      } catch {
        if (!cancelled) setNowPlaying(null)
      }
    }
    poll()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') poll()
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [connected])

  if (!connected || !nowPlaying?.playing) return null

  return (
    <div className="now-playing" aria-live="polite">
      {nowPlaying.albumImage && <img src={nowPlaying.albumImage} alt="" />}
      <div className="now-playing-info">
        <div className="now-playing-track">{nowPlaying.track}</div>
        <div className="now-playing-artist">{nowPlaying.artist}</div>
        {nowPlaying.deviceName && (
          <div className="now-playing-device">
            <span className="now-playing-bars" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
            {nowPlaying.deviceName}
          </div>
        )}
      </div>
    </div>
  )
}
