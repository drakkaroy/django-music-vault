"""The Spotify app credentials, shared by both auth flows (client-credentials for
search/autofill, Authorization Code for playback) — one place to read them from."""

import os

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


def get_credentials() -> tuple[str, str]:
    client_id = getattr(settings, "SPOTIFY_CLIENT_ID", os.environ.get("SPOTIFY_CLIENT_ID", ""))
    client_secret = getattr(
        settings, "SPOTIFY_CLIENT_SECRET", os.environ.get("SPOTIFY_CLIENT_SECRET", "")
    )
    if not client_id or not client_secret:
        raise ImproperlyConfigured("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set")
    return client_id, client_secret
