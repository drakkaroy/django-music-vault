import './TagChip.css'

interface TagChipProps {
  label: string
  active?: boolean
  onClick: () => void
}

export function TagChip({ label, active, onClick }: TagChipProps) {
  return (
    <button className={`tag-chip ${active ? 'on' : ''}`} aria-pressed={!!active} onClick={onClick}>
      {label}
    </button>
  )
}
