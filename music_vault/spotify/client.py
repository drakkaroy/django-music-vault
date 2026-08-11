import time

import requests

BASE_URL = "https://api.spotify.com/v1"
MAX_RETRIES = 3


class SpotifyClient:
    def __init__(self, auth):
        self.auth = auth

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.auth.get_token()}"}

    def _get(self, path: str, params: dict | None = None) -> dict:
        url = f"{BASE_URL}{path}"
        for attempt in range(MAX_RETRIES):
            response = requests.get(url, headers=self._headers(), params=params, timeout=10)
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 2 ** attempt))
                time.sleep(retry_after)
                continue
            response.raise_for_status()
            return response.json()
        raise RuntimeError("Spotify rate limit exceeded after retries")

    def search_albums(self, query: str, limit: int = 10) -> dict:
        return self._get("/search", params={"q": query, "type": "album", "limit": limit})

    def get_album(self, album_id: str) -> dict:
        return self._get(f"/albums/{album_id}")
