import { useState } from 'react'
import { applyFilters, emptyFilters, sortAlbums, type Filters } from '../lib/filters'
import type { Album, Library } from '../types/api'
import { AlbumGrid } from './AlbumGrid'
import { Toolbar } from './Toolbar'
import { BackLink, Button, IconButton, LibDot, ViewToggle, type ViewMode } from './ui'

interface LibraryViewProps {
  library: Library
  /** Public share page: hides the "all libraries" back link and the
   * add/edit/delete head actions, and doesn't let AlbumGrid render a
   * favorite toggle. Everything else — filters, sort, view toggle, the
   * grid itself — is identical, since it's all display, not mutation. */
  readOnly?: boolean
  onBack?: () => void
  onAddAlbum?: () => void
  onEditLibrary?: () => void
  onDeleteLibrary?: () => void
  onOpenAlbum: (album: Album) => void
  onPlayAlbum: (album: Album) => void
  onToggleFavorite?: (album: Album) => void
}

export function LibraryView({
  library,
  readOnly,
  onBack,
  onAddAlbum,
  onEditLibrary,
  onDeleteLibrary,
  onOpenAlbum,
  onPlayAlbum,
  onToggleFavorite,
}: LibraryViewProps) {
  // Per-library filter memory (like the vanilla app's uiState[libId]) isn't
  // ported yet — this resets when you navigate away and back. Small,
  // deliberate simplification for now.
  const [filters, setFilters] = useState<Filters>(emptyFilters())
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')
  const filtered = sortAlbums(applyFilters(library.albums, filters), filters.sort)

  return (
    <div className="view">
      {!readOnly && onBack && <BackLink onClick={onBack}>← All libraries</BackLink>}
      <div className="page-head">
        <div>
          <h1>
            <LibDot color={library.color} size={14} />
            {library.name}
          </h1>
          <p className="page-sub">{library.description}</p>
        </div>
        {!readOnly && (
          <div className="head-actions">
            <Button variant="accent" onClick={onAddAlbum}>
              ＋ Add album
            </Button>
            <IconButton aria-label="Edit library" title="Edit library" onClick={onEditLibrary}>
              ✎
            </IconButton>
            <IconButton aria-label="Delete library" title="Delete library" onClick={onDeleteLibrary}>
              🗑
            </IconButton>
          </div>
        )}
      </div>
      <Toolbar albums={library.albums} filters={filters} onChange={setFilters} />
      <div className="grid-bar">
        <p className="result-count">
          {filtered.length} of {library.albums.length} albums
        </p>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>
      <AlbumGrid
        albums={filtered}
        sort={filters.sort}
        viewMode={viewMode}
        readOnly={readOnly}
        onOpen={onOpenAlbum}
        onPlay={onPlayAlbum}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  )
}
