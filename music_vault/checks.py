"""System checks for host-project configuration — see docs/configuration.md#system-checks.

Registered from ``MusicVaultConfig.ready()``. Everything here is a Warning, never an Error:
the package works without Spotify or cover downloads, so a missing optional setting must not
block ``migrate``/``runserver`` — it just gets surfaced in ``manage.py check`` instead of at
first use."""

from django.conf import settings
from django.core.checks import Tags, Warning, register
from django.core.exceptions import ImproperlyConfigured

from .spotify.credentials import get_credentials


@register(Tags.compatibility)
def check_music_vault_settings(app_configs, **kwargs):
    warnings = []
    try:
        get_credentials()
    except ImproperlyConfigured:
        warnings.append(
            Warning(
                "SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are not set.",
                hint="Spotify search, autofill and playback endpoints answer 503 until they are "
                "(docs/configuration.md#environment-variables).",
                id="music_vault.W001",
            )
        )
    if not getattr(settings, "MEDIA_ROOT", ""):
        warnings.append(
            Warning(
                "MEDIA_ROOT is empty; downloaded album covers would be written relative to the "
                "process working directory.",
                hint="Set MEDIA_ROOT and MEDIA_URL (docs/configuration.md#media-cover-downloads).",
                id="music_vault.W002",
            )
        )
    return warnings
