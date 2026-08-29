import type { CSSProperties, ReactNode } from 'react'

interface NavItemProps {
  /** A glyph string (⌂, ♥) or a component like <LibDot /> — both render
   * fine inside the .nav-ico span. */
  icon: ReactNode
  label: ReactNode
  count?: number
  active?: boolean
  onClick: () => void
  /** Escape hatch for one-off looks (e.g. "New library"'s accent color on
   * the whole row, icon included) rather than a new prop per use case. */
  style?: CSSProperties
}

export function NavItem({ icon, label, count, active, onClick, style }: NavItemProps) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} style={style} onClick={onClick}>
      <span className="nav-ico">{icon}</span>
      {label}
      {count !== undefined && <span className="count">{count}</span>}
    </button>
  )
}
