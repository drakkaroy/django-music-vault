import { useState, type FormEvent } from 'react'
import { createLibrary, updateLibrary } from '../api/client'
import { useVault } from '../context/VaultContext'
import type { Library } from '../types/api'
import './LibraryFormModal.css'
import { Button, ColorSwatch, IconButton, Modal } from './ui'

const LIB_COLORS = ['#e0654a', '#4a90e0', '#1ed760', '#b678e8', '#ffcf5c', '#ff5c8a', '#4ad4c9', '#8a93a5']

interface LibraryFormModalProps {
  /** Omitted = create mode. */
  library?: Library
  onClose: () => void
  /** Only called on create, so the caller can navigate straight into the
   * new library — matching the vanilla app's behavior. */
  onCreated: (library: Library) => void
}

export function LibraryFormModal({ library, onClose, onCreated }: LibraryFormModalProps) {
  const { state, refreshState, pushToast } = useVault()
  const [name, setName] = useState(library?.name ?? '')
  const [description, setDescription] = useState(library?.description ?? '')
  const [color, setColor] = useState(library?.color ?? LIB_COLORS[state.libraries.length % LIB_COLORS.length])
  const [isPublic, setIsPublic] = useState(library?.isPublic ?? false)

  const shareUrl = (slug: string) => `${location.origin}/${state.username}/${slug}/`

  const copyShareLink = async () => {
    if (!library) return
    try {
      await navigator.clipboard.writeText(shareUrl(library.slug))
      pushToast('Link copied')
    } catch {
      pushToast('Could not copy — select and copy the link manually', '⚠')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      if (library) {
        await updateLibrary(library.id, { name, description, color, isPublic })
        await refreshState()
        pushToast('Library updated')
        onClose()
      } else {
        const created = await createLibrary({ name, description, color, isPublic })
        await refreshState()
        onClose()
        onCreated(created)
        pushToast(
          created.isPublic
            ? `Library "${name}" created — public at ${shareUrl(created.slug)}`
            : `Library "${name}" created — add your first album!`,
        )
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Something went wrong', '⚠')
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>{library ? 'Edit library' : 'New library'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="l-name">Name *</label>
          <input
            id="l-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jazz Nights"
          />
        </div>
        <div className="field">
          <label htmlFor="l-desc">Description</label>
          <input
            id="l-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What lives in this library?"
          />
        </div>
        <div className="field">
          <label>Color</label>
          <div className="color-row">
            {LIB_COLORS.map((c) => (
              <ColorSwatch key={c} color={c} active={c === color} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <div className="field">
          <label className="checkbox-label">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Make this library public
          </label>
          <p className="hint">Anyone with the link can browse it read-only — no login, no editing.</p>
          {isPublic && library && (
            <div className="share-row">
              <input readOnly value={shareUrl(library.slug)} onFocus={(e) => e.target.select()} />
              <IconButton aria-label="Copy share link" title="Copy link" onClick={copyShareLink}>
                ⧉
              </IconButton>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" type="submit">
            {library ? 'Save' : 'Create library'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
