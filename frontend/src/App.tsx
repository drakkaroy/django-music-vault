import { useState } from 'react'
import './App.css'
import {
  deleteLibrary,
  importBackup,
  playAlbum,
  SPOTIFY_CONNECT_URL,
  spotifyAlbumDetail,
  toggleFavorite,
} from './api/client'
import { AlbumDetailModal } from './components/AlbumDetailModal'
import { AlbumFormModal } from './components/AlbumFormModal'
import { FavoritesView } from './components/FavoritesView'
import { HomeView } from './components/HomeView'
import { LibraryFormModal } from './components/LibraryFormModal'
import { LibraryView } from './components/LibraryView'
import { PickLibraryModal } from './components/PickLibraryModal'
import { Sidebar } from './components/Sidebar'
import { SpotifySearchModal } from './components/SpotifySearchModal'
import { StatsView } from './components/StatsView'
import { ToastStack } from './components/ToastStack'
import { TracklistModal } from './components/TracklistModal'
import { useVault } from './context/VaultContext'
import type { Album, Library, SpotifySearchResult, SpotifyTopAlbum } from './types/api'

export type View = 'home' | 'favorites' | 'library' | 'stats'

interface Route {
  view: View
  libId: string | null
}

// One state machine instead of a bag of booleans — same idea as the
// vanilla app's single #modalRoot.
type ModalState =
  | { type: 'library-form'; library?: Library }
  | { type: 'spotify-search'; libraryId: string }
  | { type: 'album-form'; libraryId: string; album?: Album; spotify?: SpotifySearchResult }
  | { type: 'album-detail'; library: Library; album: Album }
  | { type: 'tracklist'; album: Album }
  | { type: 'pick-library'; spotify: SpotifySearchResult }
  | null

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

  const handlePlayAlbum = async (album: Album, trackUri?: string) => {
    if (!spotifyConnected) {
      pushToast('Connect your Spotify account first — see the sidebar 🎧', '⚠')
      return
    }
    try {
      await playAlbum(album.id, trackUri)
      pushToast(trackUri ? 'Now playing this track ▶' : 'Now playing on Spotify ▶')
    } catch (err) {
      pushToast(errorMessage(err), '⚠')
    }
  }

  const openAlbumDetail = (album: Album, library: Library) =>
    setModal({ type: 'album-detail', library, album })

  /** Favorites/Statistics show albums from any library, so the owning
   * library has to be looked up by the album's id first. */
  const openAnyAlbum = (album: Album) => {
    const owner = state.libraries.find((l) => l.albums.some((a) => a.id === album.id))
    if (owner) openAlbumDetail(album, owner)
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

  const handleAddFromTopAlbums = async (item: SpotifyTopAlbum) => {
    if (state.libraries.length === 0) {
      pushToast('Create a library first', '⚠')
      return
    }
    try {
      const detail = await spotifyAlbumDetail(item.spotify_id)
      setModal({ type: 'pick-library', spotify: detail })
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

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `vinylvault-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    pushToast('Backup downloaded', '⭳')
  }

  const handleImportFile = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      if (!Array.isArray(data.libraries)) throw new Error('Invalid backup file')
      await importBackup(data)
      await refreshState()
      navigate('home')
      pushToast('Backup restored ✓')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Invalid backup file', '⚠')
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
        onExport={handleExport}
        onImportFile={handleImportFile}
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
              onOpenAlbum={openAnyAlbum}
              onPlayAlbum={handlePlayAlbum}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
          {route.view === 'stats' && (
            <StatsView
              libraries={state.libraries}
              spotifyConnected={spotifyConnected}
              onOpenAlbum={openAnyAlbum}
              onAddFromSpotify={handleAddFromTopAlbums}
            />
          )}
          {route.view === 'library' && activeLibrary && (
            <LibraryView
              library={activeLibrary}
              onBack={() => navigate('home')}
              onAddAlbum={() => setModal({ type: 'spotify-search', libraryId: activeLibrary.id })}
              onEditLibrary={() => setModal({ type: 'library-form', library: activeLibrary })}
              onDeleteLibrary={() => handleDeleteLibrary(activeLibrary)}
              onOpenAlbum={(album) => openAlbumDetail(album, activeLibrary)}
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
      {modal?.type === 'spotify-search' && (
        <SpotifySearchModal
          libraryName={state.libraries.find((l) => l.id === modal.libraryId)?.name ?? ''}
          onClose={() => setModal(null)}
          onManualEntry={() => setModal({ type: 'album-form', libraryId: modal.libraryId })}
          onUseResult={(result) =>
            setModal({ type: 'album-form', libraryId: modal.libraryId, spotify: result })
          }
        />
      )}
      {modal?.type === 'pick-library' && (
        <PickLibraryModal
          libraries={state.libraries}
          onClose={() => setModal(null)}
          onPick={(libraryId) => setModal({ type: 'album-form', libraryId, spotify: modal.spotify })}
        />
      )}
      {modal?.type === 'album-form' && (
        <AlbumFormModal
          libraryId={modal.libraryId}
          libraryName={state.libraries.find((l) => l.id === modal.libraryId)?.name ?? ''}
          album={modal.album}
          spotify={modal.spotify}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'album-detail' && (
        <AlbumDetailModal
          library={modal.library}
          album={modal.album}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: 'album-form', libraryId: modal.library.id, album: modal.album })}
          onOpenTracklist={() => setModal({ type: 'tracklist', album: modal.album })}
          onPlay={() => handlePlayAlbum(modal.album)}
          onToggleFavorite={() => handleToggleFavorite(modal.album)}
        />
      )}
      {modal?.type === 'tracklist' && (
        <TracklistModal
          album={modal.album}
          onClose={() => setModal(null)}
          onPlayTrack={(trackUri) => handlePlayAlbum(modal.album, trackUri)}
        />
      )}
      <ToastStack />
    </div>
  )
}
