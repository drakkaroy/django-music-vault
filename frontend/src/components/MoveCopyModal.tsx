import { useRef, useState } from 'react'
import type { Album, Library } from '../types/api'
import { IconButton, LibDot, Modal } from './ui'

interface MoveCopyModalProps {
  mode: 'move' | 'copy'
  album: Album
  libraries: Library[]
  fromLibraryId: string
  onClose: () => void
  onConfirm: (libraryId: string, keepTags: boolean) => Promise<void>
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
  const [pending, setPending] = useState(false)
  // setPending(true) doesn't take effect until the next render, so a second
  // click fired before then would still see the button enabled — this ref
  // is checked synchronously to close that gap and stop a double-click from
  // firing two copy/move requests (and, for copy, creating two albums).
  const confirming = useRef(false)
  // Moving into the album's current library is a no-op; copying there is a
  // legitimate "duplicate this album" use, so only move filters it out.
  const targets = mode === 'move' ? libraries.filter((l) => l.id !== fromLibraryId) : libraries

  const handlePick = async (libraryId: string) => {
    if (confirming.current) return
    confirming.current = true
    setPending(true)
    try {
      await onConfirm(libraryId, keepTags)
    } finally {
      // No-op if onConfirm closed the modal on success (unmounting this
      // component) — only matters for re-enabling the buttons on failure.
      confirming.current = false
      setPending(false)
    }
  }

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
            <button
              key={l.id}
              className="pick-library-item"
              disabled={pending}
              onClick={() => handlePick(l.id)}
            >
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
