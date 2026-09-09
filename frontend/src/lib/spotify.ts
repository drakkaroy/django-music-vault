/** Turns a stored `spotifyUri` — free text, either a `spotify:album:...`
 * URI or an `open.spotify.com/album/...` share link (see AlbumFormModal's
 * placeholder and normalize_context_uri() in spotify/player.py, which this
 * mirrors) — into a web link anyone can open, no app or API call needed.
 * Used by the public library page's Play button. Returns null when the
 * value doesn't contain a recognizable album id. */
export function spotifyAlbumWebUrl(uri: string): string | null {
  return spotifyWebUrl(uri, 'album')
}

/** Same idea for a single track's `spotifyUri` (`spotify:track:...`). */
export function spotifyTrackWebUrl(uri: string): string | null {
  return spotifyWebUrl(uri, 'track')
}

function spotifyWebUrl(uri: string, kind: 'album' | 'track'): string | null {
  const value = (uri || '').trim()
  if (!value) return null
  if (value.startsWith(`spotify:${kind}:`)) {
    return `https://open.spotify.com/${kind}/${value.slice(`spotify:${kind}:`.length)}`
  }
  const match = value.match(new RegExp(`open\\.spotify\\.com/${kind}/([A-Za-z0-9]+)`))
  return match ? `https://open.spotify.com/${kind}/${match[1]}` : null
}
