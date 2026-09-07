import { coverOf } from '../lib/cover'
import { fmtDurationLong } from '../lib/duration'
import { computeStats } from '../lib/stats'
import type { Album, Library, SpotifyTopAlbum } from '../types/api'
import { TopAlbumsSection } from './TopAlbumsSection'
import { StarRating, StatBar } from './ui'

interface StatsViewProps {
  libraries: Library[]
  spotifyConnected: boolean
  onOpenAlbum: (album: Album) => void
  onAddFromSpotify: (item: SpotifyTopAlbum) => void
}

export function StatsView({ libraries, spotifyConnected, onOpenAlbum, onAddFromSpotify }: StatsViewProps) {
  const stats = computeStats(libraries)
  const genreMax = stats.byGenre[0]?.[1] ?? 0
  const decadeMax = Math.max(0, ...stats.byDecade.map(([, count]) => count))
  const countryMax = stats.byCountry[0]?.[1] ?? 0

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>📊 Statistics</h1>
          <p className="page-sub">A look at your whole collection, across every library.</p>
        </div>
      </div>

      <div className="stats-summary">
        <div className="stat-tile">
          <div className="stat-tile-value">{stats.totalAlbums}</div>
          <div className="stat-tile-label">Albums</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{stats.totalLibraries}</div>
          <div className="stat-tile-label">Libraries</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{stats.totalFavorites}</div>
          <div className="stat-tile-label">Favorites</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">
            {stats.averageRating ? `★${stats.averageRating.toFixed(1)}` : '—'}
          </div>
          <div className="stat-tile-label">Avg rating</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{fmtDurationLong(stats.totalDurationMs)}</div>
          <div className="stat-tile-label">Catalogued</div>
        </div>
      </div>

      <TopAlbumsSection
        libraries={libraries}
        connected={spotifyConnected}
        onOpenAlbum={onOpenAlbum}
        onAdd={onAddFromSpotify}
      />

      {stats.totalAlbums === 0 ? (
        <div className="empty-state">
          <div className="big">📊</div>
          <h3>Nothing to show yet</h3>
          <p>Add a few albums and come back — your collection's stats will show up here.</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            {stats.byGenre.length > 0 && (
              <section className="stats-section">
                <h2>By genre</h2>
                {stats.byGenre.map(([label, count]) => (
                  <StatBar key={label} label={label} count={count} max={genreMax} />
                ))}
              </section>
            )}
            {stats.byDecade.length > 0 && (
              <section className="stats-section">
                <h2>By decade</h2>
                {stats.byDecade.map(([decade, count]) => (
                  <StatBar key={decade} label={`${decade}s`} count={count} max={decadeMax} />
                ))}
              </section>
            )}
            {stats.byCountry.length > 0 && (
              <section className="stats-section">
                <h2>By country</h2>
                {stats.byCountry.map(([label, count]) => (
                  <StatBar key={label} label={label} count={count} max={countryMax} />
                ))}
              </section>
            )}
          </div>

          {stats.topTags.length > 0 && (
            <section className="stats-section">
              <h2>Top tags</h2>
              <div className="stats-tag-row">
                {stats.topTags.map(([tag, count]) => (
                  <span className="tg" key={tag}>
                    #{tag} · {count}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="stats-section">
            <h2>Highlights</h2>
            <dl className="spec">
              {stats.mostProlificArtist && (
                <>
                  <dt>Most albums by</dt>
                  <dd>
                    {stats.mostProlificArtist[0]} ({stats.mostProlificArtist[1]})
                  </dd>
                </>
              )}
              {stats.oldestAlbum && (
                <>
                  <dt>Oldest album</dt>
                  <dd>
                    {stats.oldestAlbum.title} ({stats.oldestAlbum.year})
                  </dd>
                </>
              )}
              {stats.newestAlbum && (
                <>
                  <dt>Last added</dt>
                  <dd>{stats.newestAlbum.title}</dd>
                </>
              )}
            </dl>
          </section>

          {stats.topRated.length > 0 && (
            <section className="stats-section">
              <h2>Top rated</h2>
              <div className="stats-top-rated">
                {stats.topRated.map((a) => (
                  <button
                    key={a.id}
                    className="stats-top-rated-item"
                    onClick={() => onOpenAlbum(a)}
                    aria-label={`Open ${a.title} by ${a.artist}`}
                  >
                    <img src={coverOf(a)} alt="" />
                    <div>
                      <div className="t">{a.title}</div>
                      <div className="a">{a.artist}</div>
                      <StarRating value={a.rating} />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
