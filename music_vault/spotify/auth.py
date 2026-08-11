import base64
import time

import requests


class SpotifyAuth:
    """Client-credentials token holder with in-memory caching."""

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self._token: str | None = None
        self._expires_at: float = 0

    def get_token(self) -> str:
        if self._token and time.time() < self._expires_at - 60:
            return self._token

        auth_str = f"{self.client_id}:{self.client_secret}"
        b64 = base64.b64encode(auth_str.encode()).decode()

        response = requests.post(
            "https://accounts.spotify.com/api/token",
            headers={"Authorization": f"Basic {b64}"},
            data={"grant_type": "client_credentials"},
            timeout=10,
        )
        response.raise_for_status()

        data = response.json()
        self._token = data["access_token"]
        self._expires_at = time.time() + data["expires_in"]
        return self._token
