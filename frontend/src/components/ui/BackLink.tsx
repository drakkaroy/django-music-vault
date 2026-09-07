import type { ReactNode } from 'react'
import './BackLink.css'

export function BackLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="back-link" onClick={onClick}>
      {children}
    </button>
  )
}
