import { coverOf } from '../lib/cover'
import type { Library } from '../types/api'

interface HomeViewProps {
  libraries: Library[]
  onOpenLibrary: (id: string) => void
  onNewLibrary: () => void
}

export function HomeView({ libraries, onOpenLibrary, onNewLibrary }: HomeViewProps) {
  const total = libraries.reduce((n, l) => n + l.albums.length, 0)
  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Your Libraries</h1>
          <p className="page-sub">
            {libraries.length} libraries · {total} albums · synced to your vault
          </p>
        </div>
        <div className="head-actions">
          <button className="btn btn-accent" onClick={onNewLibrary}>
            ＋ New library
          </button>
        </div>
      </div>
      <div className="lib-grid">
        {libraries.map((l, i) => {
          const covers = l.albums.slice(0, 4)
          const tileCount = covers.length > 1 ? Math.max(covers.length, 4) : covers.length
          return (
            <button
              key={l.id}
              className="lib-card"
              style={{ animationDelay: `${i * 60}ms` }}
              aria-label={`Open library ${l.name}`}
              onClick={() => onOpenLibrary(l.id)}
            >
              <div className={`mosaic ${covers.length <= 1 ? 'single' : ''}`}>
                {tileCount === 0 && <div className="empty-tile">♪</div>}
                {Array.from({ length: tileCount }, (_, i) =>
                  covers[i] ? (
                    <img key={covers[i].id} src={coverOf(covers[i])} alt="" loading="lazy" />
                  ) : (
                    <div key={`empty-${i}`} className="empty-tile">
                      ♪
                    </div>
                  ),
                )}
              </div>
              <h3>
                <span className="lib-dot" style={{ background: l.color }} />
                {l.name}
              </h3>
              <p>{l.description}</p>
              <p style={{ marginTop: 8, color: 'var(--text-faint)' }}>
                {l.albums.length} albums · {l.albums.filter((a) => a.favorite).length} ♥
              </p>
            </button>
          )
        })}
        <button
          className="lib-card-new"
          style={{ animationDelay: `${libraries.length * 60}ms` }}
          onClick={onNewLibrary}
        >
          <span>
            <span className="plus">＋</span>Create a library
          </span>
        </button>
      </div>
    </div>
  )
}
