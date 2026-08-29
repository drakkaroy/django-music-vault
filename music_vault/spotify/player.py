"""Spotify Connect playback control for a single user's linked account."""

import re
import time

import requests

from . import oauth

API_BASE = "https://api.spotify.com/v1"
_ALBUM_URL_RE = re.compile(r"open\.spotify\.com/album/([A-Za-z0-9]+)")


class NoActiveDevice(Exception):
    """Raised when the user has no Spotify device open to play on."""


def normalize_context_uri(value: str) -> str | None:
    """Accept either a ``spotify:album:...`` URI or an open.spotify.com share
    link (the album form takes free text) and return a play-ready URI."""
    value = (value or "").strip()
    if value.startswith("spotify:album:"):
        return value
    match = _ALBUM_URL_RE.search(value)
    return f"spotify:album:{match.group(1)}" if match else None


class PlayerClient:
    """Per-user client that refreshes the account's access token as needed."""

    def __init__(self, account):
        self.account = account

    def _ensure_token(self) -> str:
        if self.account.expires_at <= time.time() + 30:
            data = oauth.refresh_access_token(self.account.refresh_token)
            self.account.access_token = data["access_token"]
            self.account.expires_at = time.time() + data.get("expires_in", 3600)
            if data.get("refresh_token"):
                self.account.refresh_token = data["refresh_token"]
            self.account.save(update_fields=["access_token", "refresh_token", "expires_at"])
        return self.account.access_token

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._ensure_token()}"}

    def list_devices(self) -> list[dict]:
        response = requests.get(f"{API_BASE}/me/player/devices", headers=self._headers(), timeout=10)
        response.raise_for_status()
        return response.json().get("devices", [])

    def play(self, context_uri: str) -> None:
        response = requests.put(
            f"{API_BASE}/me/player/play",
            headers=self._headers(),
            json={"context_uri": context_uri},
            timeout=10,
        )
        if response.status_code == 404:
            devices = self.list_devices()
            if not devices:
                raise NoActiveDevice()
            response = requests.put(
                f"{API_BASE}/me/player/play",
                params={"device_id": devices[0]["id"]},
                headers=self._headers(),
                json={"context_uri": context_uri},
                timeout=10,
            )
        response.raise_for_status()
