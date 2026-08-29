import os

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .auth import SpotifyAuth
from .client import SpotifyClient


def _get_credentials() -> tuple[str, str]:
    client_id = getattr(settings, "SPOTIFY_CLIENT_ID", os.environ.get("SPOTIFY_CLIENT_ID", ""))
    client_secret = getattr(settings, "SPOTIFY_CLIENT_SECRET", os.environ.get("SPOTIFY_CLIENT_SECRET", ""))
    if not client_id or not client_secret:
        raise ImproperlyConfigured("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set")
    return client_id, client_secret


class SpotifyService:
    def __init__(self):
        client_id, client_secret = _get_credentials()
        self.client = SpotifyClient(SpotifyAuth(client_id, client_secret))

    def search_albums(self, query: str, limit: int = 10) -> list[dict]:
        result = self.client.search_albums(query, limit=limit)
        albums = result.get("albums", {}).get("items", [])
        return [_normalize_album(a) for a in albums]

    def get_album(self, album_id: str) -> dict:
        return _normalize_album(self.client.get_album(album_id))


_service: SpotifyService | None = None


def get_service() -> SpotifyService:
    global _service
    if _service is None:
        _service = SpotifyService()
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
