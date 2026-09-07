interface PlayButtonProps {
  label: string
  onClick: () => void
}

/** Always sits inside a clickable album card, so it stops propagation
 * itself rather than making every call site remember to. */
export function PlayButton({ label, onClick }: PlayButtonProps) {
  return (
    <button
      className="play-btn"
      aria-label={label}
      title="Play on Spotify"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      ▶
    </button>
  )
}
