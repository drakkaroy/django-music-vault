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


def _looks_like(data: bytes, extension: str) -> bool:
    """Magic-byte check so the Content-Type header is trusted no further than
    picking the file extension — whatever lands in MEDIA_ROOT is an image."""
    if extension == ".jpg":
        return data.startswith(b"\xff\xd8\xff")
    if extension == ".png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if extension == ".webp":
        return data.startswith(b"RIFF") and data[8:12] == b"WEBP"
    return False


def fetch_cover(url: str) -> tuple[str, ContentFile] | tuple[None, None]:
    """Download a cover image from Spotify's CDN.

    Returns ``(filename, ContentFile)``, or ``(None, None)`` when the URL
    is not downloadable (disallowed host, redirect, not an image, too big,
    or a network error). Callers treat this as best-effort: the album keeps
    its remote URL either way."""
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_COVER_HOSTS:
        return None, None
    try:
        # allow_redirects=False: the host allowlist above was checked against
        # the URL we were given, so we must never silently follow it elsewhere.
        with requests.get(
            url, timeout=DOWNLOAD_TIMEOUT, stream=True, allow_redirects=False
        ) as response:
            if response.status_code != 200:
                return None, None
            content_type = response.headers.get("Content-Type", "").split(";")[0].strip()
            extension = _EXTENSIONS.get(content_type)
            if extension is None:
                return None, None
            chunks: list[bytes] = []
            size = 0
            for chunk in response.iter_content(64 * 1024):
                size += len(chunk)
                if size > MAX_COVER_BYTES:
                    return None, None
                chunks.append(chunk)
    except requests.RequestException:
        return None, None
    data = b"".join(chunks)
    if not data or not _looks_like(data, extension):
        return None, None
    name = posixpath.basename(parsed.path.rstrip("/")) or "cover"
    return f"{name}{extension}", ContentFile(data)
