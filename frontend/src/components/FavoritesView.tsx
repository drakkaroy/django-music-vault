import { useState } from 'react'
import { sortAlbums } from '../lib/filters'
import type { Album, Library } from '../types/api'
import { AlbumGrid } from './AlbumGrid'
import { ViewToggle, type ViewMode } from './ui'

interface FavoritesViewProps {
  libraries: Library[]
  onOpenAlbum: (album: Album) => void
  onPlayAlbum: (album: Album) => void
  onToggleFavorite: (album: Album) => void
}

export function FavoritesView({ libraries, onOpenAlbum, onPlayAlbum, onToggleFavorite }: FavoritesViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')
  const favorites = sortAlbums(
    libraries.flatMap((l) => l.albums.filter((a) => a.favorite)),
    'artist',
  )
  const libraryNameFor = (album: Album) =>
    libraries.find((l) => l.albums.some((a) => a.id === album.id))?.name ?? ''

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>♥ Favorites</h1>
          <p className="page-sub">{favorites.length} favorite albums across all libraries</p>
        </div>
      </div>
      {favorites.length ? (
        <>
          <div className="grid-bar grid-bar-end">
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
          <AlbumGrid
            albums={favorites}
            sort="artist"
            viewMode={viewMode}
            libraryNameFor={libraryNameFor}
            onOpen={onOpenAlbum}
            onPlay={onPlayAlbum}
            onToggleFavorite={onToggleFavorite}
          />
        </>
      ) : (
        <div className="empty-state">
          <div className="big">♡</div>
          <h3>No favorites yet</h3>
          <p>Hover an album and tap the heart to keep your best records here.</p>
        </div>
      )}
    </div>
  )
}
