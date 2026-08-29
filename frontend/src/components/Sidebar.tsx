import { getCookie, LOGOUT_URL } from '../api/client'
import type { Library } from '../types/api'
import type { View } from '../App'

interface SidebarProps {
  libraries: Library[]
  favCount: number
  view: View
  activeLibId: string | null
  open: boolean
  onNavigate: (view: View, libId?: string) => void
  onNewLibrary: () => void
  spotifyConnected: boolean
  onSpotifyClick: () => void
}

export function Sidebar({
  libraries,
  favCount,
  view,
  activeLibId,
  open,
  onNavigate,
  onNewLibrary,
  spotifyConnected,
  onSpotifyClick,
}: SidebarProps) {
  return (
    <nav className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
      <div className="brand">
        <span className="logo" aria-hidden="true" />
        VinylVault
      </div>
      <button className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => onNavigate('home')}>
        <span className="nav-ico">⌂</span>Home
      </button>
      <button className={`nav-item ${view === 'favorites' ? 'active' : ''}`} onClick={() => onNavigate('favorites')}>
        <span className="nav-ico">♥</span>Favorites<span className="count">{favCount}</span>
      </button>
      <div className="nav-section">Libraries</div>
      <div className="lib-list">
        {libraries.map((l) => (
          <button
            key={l.id}
            className={`nav-item ${view === 'library' && activeLibId === l.id ? 'active' : ''}`}
            onClick={() => onNavigate('library', l.id)}
          >
            <span className="lib-dot" style={{ background: l.color }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
            <span className="count">{l.albums.length}</span>
          </button>
        ))}
      </div>
      <button className="nav-item" style={{ color: 'var(--accent)' }} onClick={onNewLibrary}>
        <span className="nav-ico">＋</span>New library
      </button>
      <div className="sidebar-foot">
        <button
          className="foot-btn"
          onClick={onSpotifyClick}
          title={spotifyConnected ? 'Disconnect your Spotify account' : 'Connect your Spotify account to enable playback'}
        >
          {spotifyConnected ? '🎧 Disconnect Spotify' : '🎧 Connect Spotify'}
        </button>
        {/* Export/Import: ported in a follow-up pass */}
        <form method="post" action={LOGOUT_URL} style={{ display: 'contents' }}>
          <input type="hidden" name="csrfmiddlewaretoken" value={getCookie('csrftoken')} />
          <button className="foot-btn" type="submit" title="Sign out">
            ⏻ Logout
          </button>
        </form>
      </div>
    </nav>
  )
}
