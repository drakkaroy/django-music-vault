import { useState } from 'react'
import type { Album, Library } from '../types/api'
import { IconButton, LibDot, Modal } from './ui'

interface MoveCopyModalProps {
  mode: 'move' | 'copy'
  album: Album
  libraries: Library[]
  fromLibraryId: string
  onClose: () => void
  onConfirm: (libraryId: string, keepTags: boolean) => void
}

/** Picker behind AlbumDetailModal's "Move to..."/"Copy to..." buttons.
 * Tags are usually specific to the library they were curated for, so
 * `keepTags` defaults off — the caller decides per move/copy rather than
 * the app enforcing one rule for every situation. */
export function MoveCopyModal({
  mode,
  album,
  libraries,
  fromLibraryId,
  onClose,
  onConfirm,
}: MoveCopyModalProps) {
  const [keepTags, setKeepTags] = useState(false)
  // Moving into the album's current library is a no-op; copying there is a
  // legitimate "duplicate this album" use, so only move filters it out.
  const targets = mode === 'move' ? libraries.filter((l) => l.id !== fromLibraryId) : libraries

  return (
    <Modal onClose={onClose}>
      <IconButton aria-label="Close" className="modal-close" onClick={onClose}>
        ✕
      </IconButton>
      <h2>{mode === 'move' ? 'Move to which library?' : 'Copy to which library?'}</h2>
      <p className="page-sub">
        {album.title} — {album.artist}
      </p>
      {album.tags.length > 0 && (
        <div className="field">
          <label className="checkbox-label">
            <input type="checkbox" checked={keepTags} onChange={(e) => setKeepTags(e.target.checked)} />
            Keep tags ({album.tags.join(', ')})
          </label>
          <p className="hint">Tags are usually specific to a library — off by default.</p>
        </div>
      )}
      {targets.length === 0 ? (
        <div className="empty-state">
          <div className="big">📂</div>
          <p>No other libraries yet — create one first.</p>
        </div>
      ) : (
        <div className="pick-library-list">
          {targets.map((l) => (
            <button key={l.id} className="pick-library-item" onClick={() => onConfirm(l.id, keepTags)}>
              <LibDot color={l.color} />
              <span className="pick-library-name">
                {l.name}
                {mode === 'copy' && l.id === fromLibraryId ? ' (duplicate here)' : ''}
              </span>
              <span className="count">{l.albums.length}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
