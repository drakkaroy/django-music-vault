import { useEffect, useState, type FormEvent } from 'react'
import { spotifyAlbumDetail, spotifySearch } from '../api/client'
import { genCover } from '../lib/cover'
import type { SpotifySearchResult } from '../types/api'
import './SpotifySearchModal.css'
import { Button, IconButton, Modal } from './ui'

interface SpotifySearchModalProps {
  libraryName: string
  onClose: () => void
  onManualEntry: () => void
  onUseResult: (result: SpotifySearchResult) => void
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong'
}

export function SpotifySearchModal({
  libraryName,
  onClose,
  onManualEntry,
  onUseResult,
}: SpotifySearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifySearchResult[] | null>(null)
  const [preview, setPreview] = useState<SpotifySearchResult | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  const runSearch = async (q: string) => {
    if (!q.trim()) return
    setStatus('loading')
    setPreview(null)
    try {
      const data = await spotifySearch(q, 20)
      setResults(data.results)
      setStatus('idle')
    } catch (err) {
      setError(errorMessage(err))
      setStatus('error')
    }
  }

  useEffect(() => {
    if (!query.trim()) return
    const timer = setTimeout(() => runSearch(query), 450)
    return () => clearTimeout(timer)
  }, [query])

  const showPreview = async (spotifyId: string) => {
    setStatus('loading')
    try {
      const result = await spotifyAlbumDetail(spotifyId)
      setPreview(result)
      setStatus('idle')
    } catch (err) {
      setError(errorMessage(err))
      setStatus('error')
    }
  }

  return (
    <Modal wide onClose={onClose}>
      <IconButton aria-label="Close" className="modal-close" onClick={onClose}>
        ✕
      </IconButton>
      <h2>Add album to {libraryName}</h2>
      <form
        className="sp-search-bar"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          runSearch(query)
        }}
      >
        <input
          type="search"
          placeholder="Search Spotify — artist or album name…"
          aria-label="Search Spotify"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button variant="accent" type="submit">
          Search
        </Button>
      </form>

      {status === 'loading' && <p className="sp-hint">Loading…</p>}
      {status === 'error' && <p className="sp-hint">⚠ {error}</p>}

      {status === 'idle' && !preview && results === null && (
        <p className="sp-hint">Type an artist to browse their albums, or search an album straight away.</p>
      )}

      {status === 'idle' && !preview && results !== null && results.length === 0 && (
        <p className="sp-hint">No albums found — try a different search.</p>
      )}

      {status === 'idle' && !preview && results !== null && results.length > 0 && (
        <div className="sp-grid">
          {results.map((r) => (
            <button className="sp-card" key={r.spotify_id} onClick={() => showPreview(r.spotify_id)}>
              <img src={r.cover_url || genCover(r.artists.join(', '), r.name)} alt="" loading="lazy" />
              <span className="sp-t">{r.name}</span>
              <span className="sp-a">{r.artists.join(', ')}</span>
              <span className="sp-y">
                {(r.release_date || '').slice(0, 4)}
                {r.album_type && r.album_type !== 'album' ? ` · ${r.album_type}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {status === 'idle' && preview && (
        <div className="sp-preview">
          <img
            src={preview.cover_url || genCover(preview.artists.join(', '), preview.name)}
            alt={`Cover of ${preview.name}`}
          />
          <div>
            <h3>{preview.name}</h3>
            <div className="sp-a">{preview.artists.join(', ')}</div>
            <dl className="spec">
              <dt>Released</dt>
              <dd>{preview.release_date || '—'}</dd>
              <dt>Tracks</dt>
              <dd>{preview.total_tracks ?? '—'}</dd>
              {preview.label && (
                <>
                  <dt>Label</dt>
                  <dd>{preview.label}</dd>
                </>
              )}
              {preview.album_type && (
                <>
                  <dt>Type</dt>
                  <dd>{preview.album_type}</dd>
                </>
              )}
            </dl>
            {preview.external_url && (
              <a className="sp-link" href={preview.external_url} target="_blank" rel="noopener">
                Open in Spotify ↗
              </a>
            )}
            <div className="detail-actions">
              <Button variant="ghost" onClick={() => setPreview(null)}>
                ← Results
              </Button>
              <Button variant="accent" onClick={() => onUseResult(preview)}>
                💾 Save to library
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="modal-actions sp-manual-row">
        <Button variant="ghost" onClick={onManualEntry}>
          ✎ Enter album manually instead
        </Button>
      </div>
    </Modal>
  )
}
