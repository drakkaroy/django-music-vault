import { fmtDuration, parseDuration } from '../lib/duration'
import type { Track } from '../types/api'
import { Button } from './ui'

interface TrackEditorProps {
  tracks: Track[]
  onChange: (tracks: Track[]) => void
}

export function TrackEditor({ tracks, onChange }: TrackEditorProps) {
  const updateTrack = (i: number, patch: Partial<Track>) =>
    onChange(tracks.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  const removeTrack = (i: number) => onChange(tracks.filter((_, idx) => idx !== i))

  return (
    <>
      <div className="track-editor">
        {tracks.map((t, i) => (
          <div className="track-row-edit" key={i}>
            <input
              className="tr-num"
              type="number"
              min={1}
              value={t.trackNumber}
              aria-label="Track number"
              onChange={(e) => updateTrack(i, { trackNumber: +e.target.value || i + 1 })}
            />
            <input
              className="tr-title"
              type="text"
              value={t.title}
              placeholder="Track title"
              aria-label="Track title"
              onChange={(e) => updateTrack(i, { title: e.target.value })}
            />
            {/* Uncontrolled on purpose: reformatting "3:4" to "0:03" on every
             * keystroke (which a controlled `value` would do, since it's
             * re-derived from durationMs) would fight the user's typing.
             * The vanilla app has the same "raw text while editing, parsed
             * silently in the background" behavior. */}
            <input
              className="tr-dur"
              type="text"
              defaultValue={t.durationMs ? fmtDuration(t.durationMs) : ''}
              placeholder="m:ss"
              aria-label="Duration"
              onChange={(e) => updateTrack(i, { durationMs: parseDuration(e.target.value) })}
            />
            <button
              type="button"
              className="tr-remove"
              aria-label="Remove track"
              onClick={() => removeTrack(i)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        style={{ marginTop: 8 }}
        onClick={() =>
          onChange([...tracks, { trackNumber: tracks.length + 1, title: '', durationMs: 0, spotifyUri: '' }])
        }
      >
        + Add track
      </Button>
    </>
  )
}
