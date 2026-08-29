import type { ReactNode } from 'react'

export function BackLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="back-link" onClick={onClick}>
      {children}
    </button>
  )
}
