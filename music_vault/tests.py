import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .models import Album, Library

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
        self.assertContains(response, "VinylVault")


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
