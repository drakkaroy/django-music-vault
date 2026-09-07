"""Plain-dict serializers that mirror the JSON shape the VinylVault
frontend kept in localStorage. IDs travel as strings and datetimes as
epoch milliseconds so the original client-side code keeps working."""


def _epoch_ms(dt):
    return int(dt.timestamp() * 1000)


def _track_to_dict(track):
    return {
        "trackNumber": track.get("track_number"),
        "title": track.get("title", ""),
        "durationMs": track.get("duration_ms") or 0,
        "spotifyUri": track.get("spotify_uri", ""),
    }


def album_to_dict(album):
    tracks = sorted(album.tracks or [], key=lambda t: t.get("track_number") or 0)
    return {
        "id": str(album.pk),
        "title": album.title,
        "artist": album.artist,
        "year": album.year,
        "genre": album.genre,
        "country": album.country,
        "label": album.label,
        "cover": album.cover_url,
        "coverFile": album.cover_file.url if album.cover_file else "",
        "spotifyUri": album.spotify_uri,
        "tags": album.tags or [],
        "tracks": [_track_to_dict(t) for t in tracks],
        "favorite": album.favorite,
        "rating": album.rating,
        "addedAt": _epoch_ms(album.created_at),
    }


def library_to_dict(library, albums=None):
    if albums is None:
        albums = library.albums.all()
    return {
        "id": str(library.pk),
        "name": library.name,
        "description": library.description,
        "color": library.color,
        "createdAt": _epoch_ms(library.created_at),
        "albums": [album_to_dict(a) for a in albums],
    }


ALBUM_REQUIRED_FIELDS = ("title", "artist", "year", "genre", "country")


def _clean_tracks(tracks):
    """Validate/normalize the frontend's track rows into storage shape.

    Returns (cleaned_list, error_message)."""
    if not isinstance(tracks, list):
        return None, "Tracks must be a list"
    cleaned = []
    for i, t in enumerate(tracks, start=1):
        if not isinstance(t, dict) or not str(t.get("title", "")).strip():
            return None, f"Track {i}: title is required"
        try:
            duration_ms = max(int(t.get("durationMs") or 0), 0)
        except (TypeError, ValueError):
            return None, f"Track {i}: duration must be a number"
        try:
            track_number = int(t.get("trackNumber") or i)
        except (TypeError, ValueError):
            track_number = i
        cleaned.append({
            "track_number": track_number,
            "title": str(t["title"]).strip()[:200],
            "duration_ms": duration_ms,
            "spotify_uri": str(t.get("spotifyUri", "")).strip()[:255],
        })
    return cleaned, None


def clean_album_payload(data):
    """Validate and normalize an album payload from the frontend.

    Returns (fields_dict, error_message). ``fields_dict`` maps model
    field names to values; ``error_message`` is None when valid."""
    missing = [f for f in ALBUM_REQUIRED_FIELDS if not str(data.get(f, "")).strip()]
    if missing:
        return None, f"Missing required fields: {', '.join(missing)}"
    try:
        year = int(data["year"])
    except (TypeError, ValueError):
        return None, "Year must be a number"
    if not 1900 <= year <= 2100:
        return None, "Year must be between 1900 and 2100"
    tags = data.get("tags") or []
    if not isinstance(tags, list) or not all(isinstance(t, str) for t in tags):
        return None, "Tags must be a list of strings"
    tracks, error = _clean_tracks(data.get("tracks") or [])
    if error:
        return None, error
    try:
        rating = int(data.get("rating") or 0)
    except (TypeError, ValueError):
        return None, "Rating must be a number"
    if not 0 <= rating <= 5:
        return None, "Rating must be between 0 and 5"
    return {
        "title": str(data["title"]).strip()[:200],
        "artist": str(data["artist"]).strip()[:200],
        "year": year,
        "genre": str(data["genre"]).strip()[:100],
        "country": str(data["country"]).strip()[:100],
        "label": str(data.get("label", "")).strip()[:200],
        "cover_url": str(data.get("cover", "")).strip()[:500],
        "spotify_uri": str(data.get("spotifyUri", "")).strip()[:255],
        "tags": [t.strip()[:50] for t in tags if t.strip()],
        "tracks": tracks,
        "rating": rating,
    }, None


def clean_library_payload(data):
    name = str(data.get("name", "")).strip()
    if not name:
        return None, "Library name is required"
    return {
        "name": name[:200],
        "description": str(data.get("description", "")).strip(),
        "color": str(data.get("color", "") or "#e0654a").strip()[:7],
    }, None
