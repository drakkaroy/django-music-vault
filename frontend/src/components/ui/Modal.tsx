import { useEffect, useRef, type ReactNode } from 'react'
import './Modal.css'

interface ModalProps {
  wide?: boolean
  onClose: () => void
  children: ReactNode
}

/** Generic modal shell — every modal in the app (library form, album form,
 * Spotify search, album detail, tracklist) renders its own content inside
 * this. Closes on Escape or a click on the backdrop itself (not its
 * children), and focuses the first focusable element on open — same
 * behavior as the vanilla app's openModal()/closeModal(). */
export function Modal({ wide, onClose, children }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    const first = backdropRef.current?.querySelector<HTMLElement>('input,select,button')
    first?.focus()
  }, [])

  return (
    <div
      className="modal-backdrop"
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  )
}
