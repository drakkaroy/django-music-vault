import { useState } from 'react'
import { deleteLibrary, playAlbum, SPOTIFY_CONNECT_URL, toggleFavorite } from './api/client'
import { FavoritesView } from './components/FavoritesView'
import { HomeView } from './components/HomeView'
import { LibraryFormModal } from './components/LibraryFormModal'
import { LibraryView } from './components/LibraryView'
import { Sidebar } from './components/Sidebar'
import { ToastStack } from './components/ToastStack'
import { useVault } from './context/VaultContext'
import type { Album, Library } from './types/api'

export type View = 'home' | 'favorites' | 'library'

interface Route {
  view: View
  libId: string | null
}

// More variants (album-form, spotify-search, album-detail, tracklist) land
// here as each modal gets ported — one state machine instead of a bag of
// booleans, same idea as the vanilla app's single #modalRoot.
type ModalState = { type: 'library-form'; library?: Library } | null

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong'
}

export default function App() {
  const { state, loading, spotifyConnected, refreshState, disconnectSpotify, pushToast } = useVault()
  const [route, setRoute] = useState<Route>({ view: 'home', libId: null })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)

  const navigate = (view: View, libId?: string) => {
    setRoute({ view, libId: libId ?? null })
    setSidebarOpen(false)
  }

  const comingSoon = () => pushToast('Not ported yet — coming in the next pass 🚧', '🚧')

  const handlePlayAlbum = async (album: Album) => {
    if (!spotifyConnected) {
      pushToast('Connect your Spotify account first — see the sidebar 🎧', '⚠')
      return
    }
    try {
      await playAlbum(album.id)
      pushToast('Now playing on Spotify ▶')
    } catch (err) {
      pushToast(errorMessage(err), '⚠')
    }
  }

  const handleToggleFavorite = async (album: Album) => {
    try {
      const updated = await toggleFavorite(album.id)
      await refreshState()
      pushToast(
        updated.favorite ? `Added "${album.title}" to favorites` : `Removed "${album.title}" from favorites`,
        updated.favorite ? '♥' : '♡',
      )
    } catch (err) {
      pushToast(errorMessage(err), '⚠')
    }
  }

  const handleDeleteLibrary = async (library: Library) => {
    const ok = confirm(
      `Delete library "${library.name}" and its ${library.albums.length} albums? This cannot be undone.\n(Tip: Export a backup first from the sidebar.)`,
    )
    if (!ok) return
    try {
      await deleteLibrary(library.id)
      await refreshState()
      navigate('home')
      pushToast('Library deleted', '🗑')
    } catch (err) {
      pushToast(errorMessage(err), '⚠')
    }
  }

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
        onNewLibrary={() => setModal({ type: 'library-form' })}
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
              onNewLibrary={() => setModal({ type: 'library-form' })}
            />
          )}
          {route.view === 'favorites' && (
            <FavoritesView
              libraries={state.libraries}
              onOpenAlbum={comingSoon}
              onPlayAlbum={handlePlayAlbum}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
          {route.view === 'library' && activeLibrary && (
            <LibraryView
              library={activeLibrary}
              onBack={() => navigate('home')}
              onAddAlbum={comingSoon}
              onEditLibrary={() => setModal({ type: 'library-form', library: activeLibrary })}
              onDeleteLibrary={() => handleDeleteLibrary(activeLibrary)}
              onOpenAlbum={comingSoon}
              onPlayAlbum={handlePlayAlbum}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
        </div>
      </main>
      {modal?.type === 'library-form' && (
        <LibraryFormModal
          library={modal.library}
          onClose={() => setModal(null)}
          onCreated={(created) => navigate('library', created.id)}
        />
      )}
      <ToastStack />
    </div>
  )
}
