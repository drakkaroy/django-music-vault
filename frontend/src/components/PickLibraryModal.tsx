import type { Library } from '../types/api'
import { IconButton, LibDot, Modal } from './ui'

interface PickLibraryModalProps {
  libraries: Library[]
  onClose: () => void
  onPick: (libraryId: string) => void
}

/** Adding an album found via the statistics view's "Most listened on
 * Spotify" section has no library context the way LibraryView does, so
 * ask which one it goes into before opening the album form. */
export function PickLibraryModal({ libraries, onClose, onPick }: PickLibraryModalProps) {
  return (
    <Modal onClose={onClose}>
      <IconButton aria-label="Close" className="modal-close" onClick={onClose}>
        ✕
      </IconButton>
      <h2>Add to which library?</h2>
      <div className="pick-library-list">
        {libraries.map((l) => (
          <button key={l.id} className="pick-library-item" onClick={() => onPick(l.id)}>
            <LibDot color={l.color} />
            <span className="pick-library-name">{l.name}</span>
            <span className="count">{l.albums.length}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
