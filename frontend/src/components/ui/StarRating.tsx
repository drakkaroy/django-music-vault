interface StarRatingProps {
  value: number
  /** Omit for a read-only display (e.g. on a card). */
  onChange?: (rating: number) => void
}

const STARS = [1, 2, 3, 4, 5]

/** Clicking the currently-set star clears the rating back to 0 — there's no
 * separate "clear" control. */
export function StarRating({ value, onChange }: StarRatingProps) {
  const readOnly = !onChange

  return (
    <div
      className={`star-rating${readOnly ? ' read-only' : ''}`}
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {STARS.map((n) =>
        readOnly ? (
          <span key={n} aria-hidden="true">
            {n <= value ? '★' : '☆'}
          </span>
        ) : (
          <button
            key={n}
            type="button"
            aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
            aria-pressed={n <= value}
            onClick={() => onChange(n === value ? 0 : n)}
          >
            {n <= value ? '★' : '☆'}
          </button>
        ),
      )}
    </div>
  )
}
