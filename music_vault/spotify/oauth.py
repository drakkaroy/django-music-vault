"""Authorization Code flow (per-user OAuth), used only for playback control.

Kept separate from ``auth.py``/``client.py``, which use the app-level
client-credentials flow for search/autofill and need no user consent."""

import os
import secrets
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
SCOPES = "user-read-playback-state user-modify-playback-state"


def _get_credentials() -> tuple[str, str]:
    client_id = getattr(settings, "SPOTIFY_CLIENT_ID", os.environ.get("SPOTIFY_CLIENT_ID", ""))
    client_secret = getattr(settings, "SPOTIFY_CLIENT_SECRET", os.environ.get("SPOTIFY_CLIENT_SECRET", ""))
    if not client_id or not client_secret:
        raise ImproperlyConfigured("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set")
    return client_id, client_secret


def new_state() -> str:
    return secrets.token_urlsafe(24)


def authorize_url(redirect_uri: str, state: str) -> str:
    client_id, _ = _get_credentials()
    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": SCOPES,
        "state": state,
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


def exchange_code(code: str, redirect_uri: str) -> dict:
    client_id, client_secret = _get_credentials()
    response = requests.post(
        TOKEN_URL,
        data={"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri},
        auth=(client_id, client_secret),
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


def refresh_access_token(refresh_token: str) -> dict:
    client_id, client_secret = _get_credentials()
    response = requests.post(
        TOKEN_URL,
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        auth=(client_id, client_secret),
        timeout=10,
    )
    response.raise_for_status()
    return response.json()
