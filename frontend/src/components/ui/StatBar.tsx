import './StatBar.css'

interface StatBarProps {
  label: string
  count: number
  max: number
}

/** A single row of a plain-CSS horizontal bar chart — no charting library,
 * just a div whose width is a percentage of the largest value in its group. */
export function StatBar({ label, count, max }: StatBarProps) {
  const pct = max ? Math.round((count / max) * 100) : 0
  return (
    <div className="stat-bar-row">
      <span className="stat-bar-label">{label}</span>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="stat-bar-count">{count}</span>
    </div>
  )
}
