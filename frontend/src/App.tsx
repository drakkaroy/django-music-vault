import { useState } from 'react'
import { SPOTIFY_CONNECT_URL } from './api/client'
import { HomeView } from './components/HomeView'
import { Sidebar } from './components/Sidebar'
import { ToastStack } from './components/ToastStack'
import { useVault } from './context/VaultContext'

export type View = 'home' | 'favorites' | 'library'

interface Route {
  view: View
  libId: string | null
}

export default function App() {
  const { state, loading, spotifyConnected, disconnectSpotify, pushToast } = useVault()
  const [route, setRoute] = useState<Route>({ view: 'home', libId: null })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigate = (view: View, libId?: string) => {
    setRoute({ view, libId: libId ?? null })
    setSidebarOpen(false)
  }

  const comingSoon = () => pushToast('Not ported yet — coming in the next pass 🚧', '🚧')

  if (loading) {
    return (
      <div className="view">
        <p className="sp-hint">Loading your vault…</p>
      </div>
    )
  }

  const favCount = state.libraries.flatMap((l) => l.albums).filter((a) => a.favorite).length
  const activeLibrary = route.libId ? state.libraries.find((l) => l.id === route.libId) : undefined

  return (
    <div className="app">
      <Sidebar
        libraries={state.libraries}
        favCount={favCount}
        view={route.view}
        activeLibId={route.libId}
        open={sidebarOpen}
        onNavigate={navigate}
        onNewLibrary={comingSoon}
        spotifyConnected={spotifyConnected}
        onSpotifyClick={() =>
          spotifyConnected ? disconnectSpotify() : (location.href = SPOTIFY_CONNECT_URL)
        }
      />
      <main className="main">
        <button className="menu-btn" aria-label="Toggle menu" onClick={() => setSidebarOpen((v) => !v)}>
          ☰ Menu
        </button>
        <div id="view">
          {route.view === 'home' && (
            <HomeView
              libraries={state.libraries}
              onOpenLibrary={(id) => navigate('library', id)}
              onNewLibrary={comingSoon}
            />
          )}
          {route.view === 'favorites' && (
            <div className="view">
              <div className="page-head">
                <div>
                  <h1>♥ Favorites</h1>
                  <p className="page-sub">{favCount} favorite albums across all libraries</p>
                </div>
              </div>
              <p className="sp-hint">Favorites grid — coming in the next pass 🚧</p>
            </div>
          )}
          {route.view === 'library' && activeLibrary && (
            <div className="view">
              <button className="back-link" onClick={() => navigate('home')}>
                ← All libraries
              </button>
              <div className="page-head">
                <div>
                  <h1>
                    <span
                      className="lib-dot"
                      style={{
                        background: activeLibrary.color,
                        display: 'inline-block',
                        width: 14,
                        height: 14,
                        marginRight: 6,
                      }}
                    />
                    {activeLibrary.name}
                  </h1>
                  <p className="page-sub">{activeLibrary.description}</p>
                </div>
              </div>
              <p className="sp-hint">Album grid, filters, and modals — coming in the next pass 🚧</p>
            </div>
          )}
        </div>
      </main>
      <ToastStack />
    </div>
  )
}
