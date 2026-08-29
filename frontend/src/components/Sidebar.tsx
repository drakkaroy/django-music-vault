import { getCookie, LOGOUT_URL } from '../api/client'
import type { View } from '../App'
import type { Library } from '../types/api'
import { FootButton, LibDot, NavItem } from './ui'

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
      <NavItem icon="⌂" label="Home" active={view === 'home'} onClick={() => onNavigate('home')} />
      <NavItem
        icon="♥"
        label="Favorites"
        count={favCount}
        active={view === 'favorites'}
        onClick={() => onNavigate('favorites')}
      />
      <div className="nav-section">Libraries</div>
      <div className="lib-list">
        {libraries.map((l) => (
          <NavItem
            key={l.id}
            icon={<LibDot color={l.color} />}
            label={
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.name}
              </span>
            }
            count={l.albums.length}
            active={view === 'library' && activeLibId === l.id}
            onClick={() => onNavigate('library', l.id)}
          />
        ))}
      </div>
      <NavItem icon="＋" label="New library" style={{ color: 'var(--accent)' }} onClick={onNewLibrary} />
      <div className="sidebar-foot">
        <FootButton
          onClick={onSpotifyClick}
          title={
            spotifyConnected
              ? 'Disconnect your Spotify account'
              : 'Connect your Spotify account to enable playback'
          }
        >
          {spotifyConnected ? '🎧 Disconnect Spotify' : '🎧 Connect Spotify'}
        </FootButton>
        {/* Export/Import: ported in a follow-up pass */}
        <form method="post" action={LOGOUT_URL} style={{ display: 'contents' }}>
          <input type="hidden" name="csrfmiddlewaretoken" value={getCookie('csrftoken')} />
          <FootButton type="submit" title="Sign out">
            ⏻ Logout
          </FootButton>
        </form>
      </div>
    </nav>
  )
}
