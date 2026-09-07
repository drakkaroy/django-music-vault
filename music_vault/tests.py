import json
import os
import shutil
import tempfile
from unittest import mock

import requests
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse

from .models import Album, Library, SpotifyAccount

User = get_user_model()


def make_album(library, **overrides):
    fields = {
        "title": "OK Computer",
        "artist": "Radiohead",
        "year": 1997,
        "genre": "Alternative Rock",
        "country": "United Kingdom",
    }
    fields.update(overrides)
    return Album.objects.create(library=library, **fields)


class ApiTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="drakk", password="secret123")
        self.other = User.objects.create_user(username="other", password="secret123")
        self.client.login(username="drakk", password="secret123")

    def post_json(self, url, data):
        return self.client.post(url, json.dumps(data), content_type="application/json")

    def put_json(self, url, data):
        return self.client.put(url, json.dumps(data), content_type="application/json")


class AuthTests(ApiTestCase):
    def test_api_requires_authentication(self):
        self.client.logout()
        response = self.client.get(reverse("music_vault:api-state"))
        self.assertEqual(response.status_code, 401)

    def test_vault_page_redirects_anonymous_to_login(self):
        self.client.logout()
        response = self.client.get(reverse("music_vault:vault"))
        self.assertEqual(response.status_code, 302)
        self.assertIn("login", response.url)

    def test_vault_page_renders_for_user(self):
        response = self.client.get(reverse("music_vault:vault"))
        self.assertContains(response, "react-app/app.js")
        self.assertContains(response, "MV_LOGOUT_URL")

    def test_vault_legacy_page_redirects_anonymous_to_login(self):
        self.client.logout()
        response = self.client.get(reverse("music_vault:vault-legacy"))
        self.assertEqual(response.status_code, 302)
        self.assertIn("login", response.url)

    def test_vault_legacy_page_renders_for_user(self):
        response = self.client.get(reverse("music_vault:vault-legacy"))
        self.assertContains(response, "music_vault/script.js")


class StateTests(ApiTestCase):
    def test_state_returns_only_own_libraries(self):
        mine = Library.objects.create(owner=self.user, name="Rock")
        make_album(mine)
        Library.objects.create(owner=self.other, name="Not yours")

        data = self.client.get(reverse("music_vault:api-state")).json()
        self.assertEqual(len(data["libraries"]), 1)
        lib = data["libraries"][0]
        self.assertEqual(lib["name"], "Rock")
        self.assertEqual(lib["id"], str(mine.pk))
        album = lib["albums"][0]
        self.assertEqual(album["artist"], "Radiohead")
        self.assertIsInstance(album["addedAt"], int)


class LibraryTests(ApiTestCase):
    def test_create_update_delete_library(self):
        response = self.post_json(
            reverse("music_vault:api-libraries"),
            {"name": "Jazz Nights", "description": "Smooth", "color": "#4a90e0"},
        )
        self.assertEqual(response.status_code, 201)
        lib_id = int(response.json()["id"])

        response = self.put_json(
            reverse("music_vault:api-library", args=[lib_id]),
            {"name": "Jazz & Blues", "description": "", "color": "#4a90e0"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Library.objects.get(pk=lib_id).name, "Jazz & Blues")

        response = self.client.delete(reverse("music_vault:api-library", args=[lib_id]))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Library.objects.filter(pk=lib_id).exists())

    def test_create_library_requires_name(self):
        response = self.post_json(reverse("music_vault:api-libraries"), {"name": "  "})
        self.assertEqual(response.status_code, 400)

    def test_cannot_touch_other_users_library(self):
        theirs = Library.objects.create(owner=self.other, name="Not yours")
        response = self.client.delete(reverse("music_vault:api-library", args=[theirs.pk]))
        self.assertEqual(response.status_code, 404)
        self.assertTrue(Library.objects.filter(pk=theirs.pk).exists())


class AlbumTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.library = Library.objects.create(owner=self.user, name="Rock")

    def test_create_album_with_frontend_payload(self):
        payload = {
            "title": "Nevermind",
            "artist": "Nirvana",
            "year": 1991,
            "genre": "Grunge",
            "country": "United States",
            "label": "DGC",
            "cover": "https://i.scdn.co/image/abc",
            "spotifyUri": "spotify:album:xyz",
            "tags": ["90s", "grunge"],
        }
        response = self.post_json(
            reverse("music_vault:api-library-albums", args=[self.library.pk]), payload
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["cover"], "https://i.scdn.co/image/abc")
        self.assertEqual(data["tags"], ["90s", "grunge"])
        self.assertFalse(data["favorite"])

    def test_create_album_with_tracks(self):
        payload = {
            "title": "Discovery", "artist": "Daft Punk", "year": 2001,
            "genre": "Electronic", "country": "France",
            "tracks": [
                {"trackNumber": 2, "title": "Aerodynamic", "durationMs": 212000, "spotifyUri": "spotify:track:abc"},
                {"trackNumber": 1, "title": "One More Time", "durationMs": 320000},
            ],
        }
        response = self.post_json(
            reverse("music_vault:api-library-albums", args=[self.library.pk]), payload
        )
        self.assertEqual(response.status_code, 201)
        tracks = response.json()["tracks"]
        self.assertEqual(len(tracks), 2)
        # sorted by track number regardless of input order
        self.assertEqual(tracks[0]["title"], "One More Time")
        self.assertEqual(tracks[0]["spotifyUri"], "")
        self.assertEqual(tracks[1]["spotifyUri"], "spotify:track:abc")

    def test_create_album_rejects_track_without_title(self):
        payload = {
            "title": "Bad", "artist": "X", "year": 2000, "genre": "G", "country": "C",
            "tracks": [{"trackNumber": 1, "durationMs": 1000}],
        }
        response = self.post_json(
            reverse("music_vault:api-library-albums", args=[self.library.pk]), payload
        )
        self.assertEqual(response.status_code, 400)

    def test_create_album_rejects_invalid_track_duration(self):
        payload = {
            "title": "Bad", "artist": "X", "year": 2000, "genre": "G", "country": "C",
            "tracks": [{"trackNumber": 1, "title": "Track", "durationMs": "not-a-number"}],
        }
        response = self.post_json(
            reverse("music_vault:api-library-albums", args=[self.library.pk]), payload
        )
        self.assertEqual(response.status_code, 400)

    def test_create_album_validates_required_fields(self):
        response = self.post_json(
            reverse("music_vault:api-library-albums", args=[self.library.pk]),
            {"title": "No artist", "year": 2000},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("artist", response.json()["error"])

    def test_update_and_delete_album(self):
        album = make_album(self.library)
        response = self.put_json(
            reverse("music_vault:api-album", args=[album.pk]),
            {
                "title": "In Rainbows",
                "artist": "Radiohead",
                "year": 2007,
                "genre": "Art Rock",
                "country": "United Kingdom",
                "tags": [],
            },
        )
        self.assertEqual(response.status_code, 200)
        album.refresh_from_db()
        self.assertEqual(album.title, "In Rainbows")

        response = self.client.delete(reverse("music_vault:api-album", args=[album.pk]))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Album.objects.filter(pk=album.pk).exists())

    def test_toggle_favorite(self):
        album = make_album(self.library)
        url = reverse("music_vault:api-album-favorite", args=[album.pk])
        self.assertTrue(self.client.post(url).json()["favorite"])
        self.assertFalse(self.client.post(url).json()["favorite"])

    def test_cannot_touch_other_users_album(self):
        theirs = Library.objects.create(owner=self.other, name="Not yours")
        album = make_album(theirs)
        response = self.client.delete(reverse("music_vault:api-album", args=[album.pk]))
        self.assertEqual(response.status_code, 404)


class ImportTests(ApiTestCase):
    def test_import_replaces_collection(self):
        old = Library.objects.create(owner=self.user, name="Old")
        make_album(old)
        keep = Library.objects.create(owner=self.other, name="Other user keeps this")

        backup = {
            "libraries": [
                {
                    "name": "Restored",
                    "description": "",
                    "color": "#e0654a",
                    "albums": [
                        {
                            "title": "Mezzanine",
                            "artist": "Massive Attack",
                            "year": 1998,
                            "genre": "Trip Hop",
                            "country": "United Kingdom",
                            "tags": ["dark"],
                            "favorite": True,
                        }
                    ],
                }
            ]
        }
        response = self.post_json(reverse("music_vault:api-import"), backup)
        self.assertEqual(response.status_code, 200)

        libraries = Library.objects.filter(owner=self.user)
        self.assertEqual(libraries.count(), 1)
        self.assertEqual(libraries[0].name, "Restored")
        self.assertTrue(libraries[0].albums.get().favorite)
        self.assertTrue(Library.objects.filter(pk=keep.pk).exists())

    def test_import_rejects_invalid_backup(self):
        response = self.post_json(reverse("music_vault:api-import"), {"nope": True})
        self.assertEqual(response.status_code, 400)

    def test_import_rolls_back_on_bad_album(self):
        Library.objects.create(owner=self.user, name="Survivor")
        backup = {
            "libraries": [
                {"name": "Bad", "albums": [{"title": "No artist", "year": 2000}]}
            ]
        }
        response = self.post_json(reverse("music_vault:api-import"), backup)
        self.assertEqual(response.status_code, 400)
        self.assertTrue(Library.objects.filter(owner=self.user, name="Survivor").exists())


class FakeImageResponse:
    def __init__(self, content=b"\xff\xd8fake-jpeg", content_type="image/jpeg"):
        self.headers = {"Content-Type": content_type}
        self._content = content

    def raise_for_status(self):
        pass

    def iter_content(self, chunk_size):
        yield self._content


class CoverDownloadTests(ApiTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._media_root = tempfile.mkdtemp()
        cls._override = override_settings(MEDIA_ROOT=cls._media_root, MEDIA_URL="/media/")
        cls._override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._override.disable()
        shutil.rmtree(cls._media_root, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        super().setUp()
        self.library = Library.objects.create(owner=self.user, name="Rock")

    def create_payload(self, **overrides):
        payload = {
            "title": "Discovery",
            "artist": "Daft Punk",
            "year": 2001,
            "genre": "Electronic",
            "country": "France",
            "cover": "https://i.scdn.co/image/abc123",
            "downloadCover": True,
        }
        payload.update(overrides)
        return payload

    def create_album(self):
        return self.post_json(
            reverse("music_vault:api-library-albums", args=[self.library.pk]),
            self.create_payload(),
        )

    @mock.patch("music_vault.covers.requests.get")
    def test_create_downloads_spotify_cover(self, get):
        get.return_value = FakeImageResponse()
        response = self.create_album()
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["cover"], "https://i.scdn.co/image/abc123")
        self.assertTrue(data["coverFile"].startswith("/media/music_vault/covers/"))
        album = Album.objects.get(pk=int(data["id"]))
        self.assertTrue(os.path.exists(album.cover_file.path))

    @mock.patch("music_vault.covers.requests.get")
    def test_download_failure_keeps_remote_cover(self, get):
        get.side_effect = requests.ConnectionError
        response = self.create_album()
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["cover"], "https://i.scdn.co/image/abc123")
        self.assertEqual(data["coverFile"], "")

    @mock.patch("music_vault.covers.requests.get")
    def test_non_spotify_host_is_never_fetched(self, get):
        response = self.post_json(
            reverse("music_vault:api-library-albums", args=[self.library.pk]),
            self.create_payload(cover="https://evil.example.com/internal.jpg"),
        )
        self.assertEqual(response.status_code, 201)
        get.assert_not_called()
        self.assertEqual(response.json()["coverFile"], "")

    @mock.patch("music_vault.covers.requests.get")
    def test_delete_album_removes_cover_file(self, get):
        get.return_value = FakeImageResponse()
        album_id = int(self.create_album().json()["id"])
        path = Album.objects.get(pk=album_id).cover_file.path
        self.assertTrue(os.path.exists(path))
        response = self.client.delete(reverse("music_vault:api-album", args=[album_id]))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(os.path.exists(path))

    @mock.patch("music_vault.covers.requests.get")
    def test_edit_keeps_file_when_cover_unchanged(self, get):
        get.return_value = FakeImageResponse()
        album_id = int(self.create_album().json()["id"])
        payload = self.create_payload(title="Discovery (edited)", downloadCover=False)
        response = self.put_json(reverse("music_vault:api-album", args=[album_id]), payload)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["coverFile"].startswith("/media/"))

    @mock.patch("music_vault.covers.requests.get")
    def test_edit_with_new_cover_discards_stale_file(self, get):
        get.return_value = FakeImageResponse()
        album_id = int(self.create_album().json()["id"])
        path = Album.objects.get(pk=album_id).cover_file.path
        payload = self.create_payload(cover="https://example.com/other.jpg", downloadCover=False)
        response = self.put_json(reverse("music_vault:api-album", args=[album_id]), payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["cover"], "https://example.com/other.jpg")
        self.assertEqual(data["coverFile"], "")
        self.assertFalse(os.path.exists(path))


class SpotifyConnectTests(ApiTestCase):
    """Authorization Code OAuth flow used to link an account for playback."""

    creds = {"SPOTIFY_CLIENT_ID": "test-client-id", "SPOTIFY_CLIENT_SECRET": "test-secret"}

    def connect_and_get_state(self):
        with self.settings(**self.creds):
            response = self.client.get(reverse("music_vault:spotify-connect"))
        self.assertEqual(response.status_code, 302)
        self.assertIn("accounts.spotify.com/authorize", response.url)
        from urllib.parse import parse_qs, urlparse
        return parse_qs(urlparse(response.url).query)["state"][0]

    def test_connect_redirects_to_spotify_with_client_id(self):
        state = self.connect_and_get_state()
        self.assertTrue(state)
        self.assertEqual(self.client.session["spotify_oauth_state"], state)

    def test_connect_without_credentials_redirects_not_configured(self):
        with self.settings(SPOTIFY_CLIENT_ID="", SPOTIFY_CLIENT_SECRET=""):
            response = self.client.get(reverse("music_vault:spotify-connect"))
        self.assertIn("spotify=not_configured", response.url)

    def test_callback_rejects_missing_state(self):
        response = self.client.get(reverse("music_vault:spotify-callback"), {"code": "abc"})
        self.assertIn("spotify=error", response.url)
        self.assertFalse(SpotifyAccount.objects.filter(user=self.user).exists())

    def test_callback_rejects_state_mismatch(self):
        self.connect_and_get_state()
        response = self.client.get(
            reverse("music_vault:spotify-callback"), {"code": "abc", "state": "wrong"}
        )
        self.assertIn("spotify=error", response.url)
        self.assertFalse(SpotifyAccount.objects.filter(user=self.user).exists())

    def test_callback_user_denied_access(self):
        response = self.client.get(reverse("music_vault:spotify-callback"), {"error": "access_denied"})
        self.assertIn("spotify=denied", response.url)

    @mock.patch("music_vault.spotify.oauth.exchange_code")
    def test_callback_success_creates_account(self, exchange_code):
        state = self.connect_and_get_state()
        exchange_code.return_value = {
            "access_token": "AT", "refresh_token": "RT", "expires_in": 3600, "scope": "user-read-playback-state",
        }
        with self.settings(**self.creds):
            response = self.client.get(
                reverse("music_vault:spotify-callback"), {"code": "abc", "state": state}
            )
        self.assertIn("spotify=connected", response.url)
        account = SpotifyAccount.objects.get(user=self.user)
        self.assertEqual(account.access_token, "AT")
        self.assertEqual(account.refresh_token, "RT")

    def test_status_reflects_connection(self):
        self.assertFalse(self.client.get(reverse("music_vault:api-spotify-status")).json()["connected"])
        SpotifyAccount.objects.create(user=self.user, access_token="a", refresh_token="r", expires_at=0)
        self.assertTrue(self.client.get(reverse("music_vault:api-spotify-status")).json()["connected"])

    def test_disconnect_removes_account(self):
        SpotifyAccount.objects.create(user=self.user, access_token="a", refresh_token="r", expires_at=0)
        response = self.client.post(reverse("music_vault:api-spotify-disconnect"))
        self.assertFalse(response.json()["connected"])
        self.assertFalse(SpotifyAccount.objects.filter(user=self.user).exists())


class AlbumPlayTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.library = Library.objects.create(owner=self.user, name="Rock")
        self.album = make_album(self.library, spotify_uri="spotify:album:abc123")

    def test_play_requires_connected_account(self):
        response = self.client.post(reverse("music_vault:api-album-play", args=[self.album.pk]))
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["code"], "not_connected")

    def test_play_rejects_album_without_spotify_link(self):
        SpotifyAccount.objects.create(user=self.user, access_token="a", refresh_token="r", expires_at=0)
        album = make_album(self.library, title="No URI", spotify_uri="")
        response = self.client.post(reverse("music_vault:api-album-play", args=[album.pk]))
        self.assertEqual(response.status_code, 400)

    @mock.patch("music_vault.views.PlayerClient")
    def test_play_reports_no_active_device(self, player_client_cls):
        from music_vault.spotify.player import NoActiveDevice
        SpotifyAccount.objects.create(user=self.user, access_token="a", refresh_token="r", expires_at=0)
        player_client_cls.return_value.play.side_effect = NoActiveDevice()
        response = self.client.post(reverse("music_vault:api-album-play", args=[self.album.pk]))
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["code"], "no_device")

    @mock.patch("music_vault.views.PlayerClient")
    def test_play_success(self, player_client_cls):
        SpotifyAccount.objects.create(user=self.user, access_token="a", refresh_token="r", expires_at=0)
        player_client_cls.return_value.play.return_value = None
        response = self.client.post(reverse("music_vault:api-album-play", args=[self.album.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["playing"])

    def test_cannot_play_other_users_album(self):
        theirs = Library.objects.create(owner=self.other, name="Not yours")
        album = make_album(theirs, spotify_uri="spotify:album:abc123")
        response = self.client.post(reverse("music_vault:api-album-play", args=[album.pk]))
        self.assertEqual(response.status_code, 404)

    @mock.patch("music_vault.views.PlayerClient")
    def test_play_track_passes_offset(self, player_client_cls):
        SpotifyAccount.objects.create(user=self.user, access_token="a", refresh_token="r", expires_at=0)
        player_client_cls.return_value.play.return_value = None
        response = self.post_json(
            reverse("music_vault:api-album-play", args=[self.album.pk]),
            {"trackUri": "spotify:track:xyz"},
        )
        self.assertEqual(response.status_code, 200)
        player_client_cls.return_value.play.assert_called_once_with(
            "spotify:album:abc123", offset_uri="spotify:track:xyz"
        )

    @mock.patch("music_vault.views.PlayerClient")
    def test_play_ignores_malformed_track_uri(self, player_client_cls):
        SpotifyAccount.objects.create(user=self.user, access_token="a", refresh_token="r", expires_at=0)
        player_client_cls.return_value.play.return_value = None
        response = self.post_json(
            reverse("music_vault:api-album-play", args=[self.album.pk]),
            {"trackUri": "not-a-spotify-uri"},
        )
        self.assertEqual(response.status_code, 200)
        player_client_cls.return_value.play.assert_called_once_with(
            "spotify:album:abc123", offset_uri=None
        )


class SpotifyTests(ApiTestCase):
    def test_search_requires_query(self):
        response = self.client.get(reverse("music_vault:api-spotify-search"))
        self.assertEqual(response.status_code, 400)

    def test_search_without_credentials_returns_503(self):
        with self.settings(SPOTIFY_CLIENT_ID="", SPOTIFY_CLIENT_SECRET=""):
            response = self.client.get(
                reverse("music_vault:api-spotify-search"), {"q": "daft punk"}
            )
        self.assertEqual(response.status_code, 503)

    def test_normalize_album_extracts_tracks(self):
        from music_vault.spotify.service import _normalize_album

        raw = {
            "id": "abc", "uri": "spotify:album:abc", "name": "Discovery",
            "artists": [{"name": "Daft Punk"}], "images": [],
            "tracks": {"items": [
                {"track_number": 1, "name": "One More Time", "duration_ms": 320000, "uri": "spotify:track:1"},
                {"track_number": 2, "name": "Aerodynamic", "duration_ms": 212000, "uri": "spotify:track:2"},
            ]},
        }
        normalized = _normalize_album(raw)
        self.assertEqual(len(normalized["tracks"]), 2)
        self.assertEqual(normalized["tracks"][0], {
            "track_number": 1, "title": "One More Time", "duration_ms": 320000, "spotify_uri": "spotify:track:1",
        })

    def test_normalize_album_search_result_has_no_tracks(self):
        from music_vault.spotify.service import _normalize_album

        normalized = _normalize_album({"id": "abc", "name": "Discovery", "artists": [], "images": []})
        self.assertEqual(normalized["tracks"], [])
