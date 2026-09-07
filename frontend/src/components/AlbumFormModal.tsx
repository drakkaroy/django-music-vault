import { useState, type FormEvent } from 'react'
import { createAlbum, updateAlbum } from '../api/client'
import { useVault } from '../context/VaultContext'
import type { Album, AlbumPayload, SpotifySearchResult, Track } from '../types/api'
import { TagEditor } from './TagEditor'
import { TrackEditor } from './TrackEditor'
import { Button, Modal } from './ui'

interface AlbumFormModalProps {
  libraryId: string
  libraryName: string
  /** Omitted = create mode. */
  album?: Album
  /** A chosen Spotify search result — prefills the form and flags the
   * server to download the cover on save. Ignored when `album` is set
   * (editing takes precedence over importing). */
  spotify?: SpotifySearchResult
  onClose: () => void
}

function initialTracks(album: Album | undefined, spotify: SpotifySearchResult | undefined): Track[] {
  if (album) return album.tracks.map((t) => ({ ...t }))
  if (spotify) {
    return spotify.tracks.map((t) => ({
      trackNumber: t.track_number,
      title: t.title,
      durationMs: t.duration_ms,
      spotifyUri: t.spotify_uri || '',
    }))
  }
  return []
}

export function AlbumFormModal({ libraryId, libraryName, album, spotify, onClose }: AlbumFormModalProps) {
  const { state, refreshState, pushToast } = useVault()
  const allAlbums = state.libraries.flatMap((l) => l.albums)
  const genreOptions = [...new Set(allAlbums.map((a) => a.genre))]
  const countryOptions = [...new Set(allAlbums.map((a) => a.country))]
  const tagOptions = [...new Set(allAlbums.flatMap((a) => a.tags))].sort()

  const [title, setTitle] = useState(album?.title ?? spotify?.name ?? '')
  const [artist, setArtist] = useState(album?.artist ?? spotify?.artists.join(', ') ?? '')
  const [year, setYear] = useState(
    album?.year ??
      (spotify
        ? +String(spotify.release_date || '').slice(0, 4) || new Date().getFullYear()
        : new Date().getFullYear()),
  )
  const [genre, setGenre] = useState(album?.genre ?? spotify?.genres[0] ?? '')
  const [country, setCountry] = useState(album?.country ?? '')
  const [label, setLabel] = useState(album?.label ?? spotify?.label ?? '')
  const [cover, setCover] = useState(album?.cover ?? spotify?.cover_url ?? '')
  const [spotifyUri, setSpotifyUri] = useState(album?.spotifyUri ?? spotify?.spotify_uri ?? '')
  const [tags, setTags] = useState<string[]>(album?.tags ?? [])
  const [tracks, setTracks] = useState<Track[]>(initialTracks(album, spotify))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const payload: AlbumPayload = {
      title,
      artist,
      year,
      genre,
      country,
      label,
      cover,
      spotifyUri,
      tags,
      tracks: tracks.filter((t) => t.title.trim()),
      downloadCover: Boolean(spotify),
    }
    try {
      if (album) {
        await updateAlbum(album.id, payload)
        pushToast('Album updated')
      } else {
        await createAlbum(libraryId, payload)
        pushToast(`Added "${title}" to ${libraryName}`)
      }
      await refreshState()
      onClose()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Something went wrong', '⚠')
    }
  }

  return (
    <Modal wide onClose={onClose}>
      <h2>{album ? 'Edit album' : `Add album to ${libraryName}`}</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="f-title">Album title *</label>
          <input
            id="f-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Random Access Memories"
          />
        </div>
        <div className="field">
          <label htmlFor="f-artist">Artist / group *</label>
          <input
            id="f-artist"
            required
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="e.g. Daft Punk"
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="f-year">Release year *</label>
            <input
              id="f-year"
              type="number"
              min={1900}
              max={2100}
              required
              value={year}
              onChange={(e) => setYear(+e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="f-genre">Genre *</label>
            <input
              id="f-genre"
              required
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="e.g. Electronic"
              list="genreList"
            />
            <datalist id="genreList">
              {genreOptions.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="f-country">Country *</label>
            <input
              id="f-country"
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. France"
              list="countryList"
            />
            <datalist id="countryList">
              {countryOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="f-label">Record label</label>
            <input
              id="f-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="optional"
            />
          </div>
        </div>
        <div className="field">
          <label>
            Tags{' '}
            <span style={{ textTransform: 'none', fontWeight: 400 }}>(unlimited — press Enter to add)</span>
          </label>
          <TagEditor tags={tags} onChange={setTags} suggestions={tagOptions} />
        </div>
        <div className="field">
          <label>
            Tracklist{' '}
            <span style={{ textTransform: 'none', fontWeight: 400 }}>
              (optional — imported automatically from Spotify)
            </span>
          </label>
          <TrackEditor tracks={tracks} onChange={setTracks} />
        </div>
        <div className="field">
          <label htmlFor="f-cover">Cover image URL</label>
          <input
            id="f-cover"
            type="url"
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="https://i.scdn.co/image/… (640×640 works great)"
          />
          <p className="hint">
            {spotify
              ? 'This cover comes from Spotify — it will be downloaded and stored in your vault.'
              : "Leave empty and I'll generate a nice vinyl-style cover automatically."}
          </p>
        </div>
        <div className="field">
          <label htmlFor="f-uri">Spotify URI / link</label>
          <input
            id="f-uri"
            value={spotifyUri}
            onChange={(e) => setSpotifyUri(e.target.value)}
            placeholder="spotify:album:… or an open.spotify.com link — used by the ▶ Play button"
          />
        </div>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" type="submit">
            {album ? 'Save changes' : 'Add album'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
