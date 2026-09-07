import { IconButton } from './IconButton'

export type ViewMode = 'detailed' | 'covers'

interface ViewToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle" role="group" aria-label="Album view">
      <IconButton
        aria-label="Detailed view"
        aria-pressed={value === 'detailed'}
        title="Show album details"
        className={value === 'detailed' ? 'on' : ''}
        onClick={() => onChange('detailed')}
      >
        ☰
      </IconButton>
      <IconButton
        aria-label="Covers only view"
        aria-pressed={value === 'covers'}
        title="Show covers only"
        className={value === 'covers' ? 'on' : ''}
        onClick={() => onChange('covers')}
      >
        ▦
      </IconButton>
    </div>
  )
}
