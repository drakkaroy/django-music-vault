from .auth import SpotifyAuth
from .client import SpotifyClient
from .credentials import get_credentials


class SpotifyService:
    def __init__(self, client_id: str, client_secret: str):
        self.credentials = (client_id, client_secret)
        self.client = SpotifyClient(SpotifyAuth(client_id, client_secret))

    def search_albums(self, query: str, limit: int = 10) -> list[dict]:
        result = self.client.search_albums(query, limit=limit)
        albums = result.get("albums", {}).get("items", [])
        return [_normalize_album(a) for a in albums]

    def get_album(self, album_id: str) -> dict:
        return _normalize_album(self.client.get_album(album_id))


_service: SpotifyService | None = None


def get_service() -> SpotifyService:
    """Lazy per-process singleton (it caches the client-credentials token). Rebuilt
    whenever the configured credentials differ from the ones it was built with, so a
    settings change — ``override_settings`` in tests included — actually takes effect
    instead of being masked by whichever credentials were seen first."""
    global _service
    credentials = get_credentials()
    if _service is None or _service.credentials != credentials:
        _service = SpotifyService(*credentials)
    return _service


def _normalize_album(album: dict) -> dict:
    images = album.get("images", [])
    cover_url = images[0]["url"] if images else None

    artist_names = [a["name"] for a in album.get("artists", [])]

    # Only the full "/albums/{id}" response includes "tracks" (search results
    # don't) — absent here just means an empty list, which is fine since the
    # frontend only needs a tracklist once it fetches an album's full detail.
    tracks = [
        {
            "track_number": t.get("track_number"),
            "title": t.get("name"),
            "duration_ms": t.get("duration_ms"),
            "spotify_uri": t.get("uri"),
        }
        for t in album.get("tracks", {}).get("items", [])
    ]

    return {
        "spotify_id": album.get("id"),
        "spotify_uri": album.get("uri"),
        "name": album.get("name"),
        "artists": artist_names,
        "release_date": album.get("release_date"),
        "total_tracks": album.get("total_tracks"),
        "cover_url": cover_url,
        "external_url": album.get("external_urls", {}).get("spotify"),
        "album_type": album.get("album_type"),
        "label": album.get("label"),
        "genres": album.get("genres", []),
        "tracks": tracks,
    }
