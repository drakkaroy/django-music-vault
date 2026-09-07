import './ColorSwatch.css'

interface ColorSwatchProps {
  color: string
  active?: boolean
  onClick: () => void
}

export function ColorSwatch({ color, active, onClick }: ColorSwatchProps) {
  return (
    <button
      type="button"
      className={`color-sw ${active ? 'on' : ''}`}
      style={{ background: color }}
      aria-label={`Color ${color}`}
      onClick={onClick}
    />
  )
}
