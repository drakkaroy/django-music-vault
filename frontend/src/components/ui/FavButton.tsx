import './FavButton.css'

interface FavButtonProps {
  active: boolean
  label: string
  onClick: () => void
}

/** Always sits inside a clickable album card, so it stops propagation
 * itself rather than making every call site remember to. */
export function FavButton({ active, label, onClick }: FavButtonProps) {
  return (
    <button
      className={`fav-btn ${active ? 'on' : ''}`}
      aria-label={label}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {active ? '♥' : '♡'}
    </button>
  )
}
