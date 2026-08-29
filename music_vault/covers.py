"""Best-effort download of album cover art into local file storage.

Only Spotify's image CDN is allowed as a source so the endpoint cannot
be abused to make the server fetch arbitrary URLs (SSRF)."""

import posixpath
from urllib.parse import urlparse

import requests
from django.core.files.base import ContentFile

ALLOWED_COVER_HOSTS = {"i.scdn.co"}
MAX_COVER_BYTES = 5 * 1024 * 1024
DOWNLOAD_TIMEOUT = 10

_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def fetch_cover(url):
    """Download a cover image from Spotify's CDN.

    Returns ``(filename, ContentFile)``, or ``(None, None)`` when the URL
    is not downloadable (disallowed host, not an image, too big, or a
    network error). Callers treat this as best-effort: the album keeps
    its remote URL either way."""
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_COVER_HOSTS:
        return None, None
    try:
        response = requests.get(url, timeout=DOWNLOAD_TIMEOUT, stream=True)
        response.raise_for_status()
    except requests.RequestException:
        return None, None
    content_type = response.headers.get("Content-Type", "").split(";")[0].strip()
    extension = _EXTENSIONS.get(content_type)
    if extension is None:
        return None, None
    data = b""
    for chunk in response.iter_content(64 * 1024):
        data += chunk
        if len(data) > MAX_COVER_BYTES:
            return None, None
    if not data:
        return None, None
    name = posixpath.basename(parsed.path.rstrip("/")) or "cover"
    return f"{name}{extension}", ContentFile(data)
