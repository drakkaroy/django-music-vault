import json

import requests
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import Album, Library
from .serializers import (
    album_to_dict,
    clean_album_payload,
    clean_library_payload,
    library_to_dict,
)
from .spotify.service import get_service


@login_required
@ensure_csrf_cookie
def vault(request):
    return render(request, "music_vault/vinylvault.html")


class ApiView(View):
    """Base for JSON endpoints: requires auth, parses JSON bodies."""

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Authentication required"}, status=401)
        self.payload = {}
        if (
            request.method in ("POST", "PUT", "PATCH")
            and request.body
            and request.content_type == "application/json"
        ):
            try:
                self.payload = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({"error": "Invalid JSON body"}, status=400)
        return super().dispatch(request, *args, **kwargs)

    def get_library(self, request, pk):
        return Library.objects.filter(owner=request.user, pk=pk).first()

    def get_album(self, request, pk):
        return Album.objects.filter(library__owner=request.user, pk=pk).first()


class StateView(ApiView):
    def get(self, request):
        libraries = Library.objects.filter(owner=request.user).prefetch_related("albums")
        return JsonResponse({"libraries": [library_to_dict(l) for l in libraries]})


class LibraryListView(ApiView):
    def post(self, request):
        fields, error = clean_library_payload(self.payload)
        if error:
            return JsonResponse({"error": error}, status=400)
        library = Library.objects.create(owner=request.user, **fields)
        return JsonResponse(library_to_dict(library, albums=[]), status=201)


class LibraryDetailView(ApiView):
    def put(self, request, pk):
        library = self.get_library(request, pk)
        if library is None:
            return JsonResponse({"error": "Library not found"}, status=404)
        fields, error = clean_library_payload(self.payload)
        if error:
            return JsonResponse({"error": error}, status=400)
        for name, value in fields.items():
            setattr(library, name, value)
        library.save()
        return JsonResponse(library_to_dict(library))

    def delete(self, request, pk):
        library = self.get_library(request, pk)
        if library is None:
            return JsonResponse({"error": "Library not found"}, status=404)
        library.delete()
        return JsonResponse({}, status=204)


class AlbumListView(ApiView):
    def post(self, request, pk):
        library = self.get_library(request, pk)
        if library is None:
            return JsonResponse({"error": "Library not found"}, status=404)
        fields, error = clean_album_payload(self.payload)
        if error:
            return JsonResponse({"error": error}, status=400)
        album = Album.objects.create(library=library, **fields)
        return JsonResponse(album_to_dict(album), status=201)


class AlbumDetailView(ApiView):
    def put(self, request, pk):
        album = self.get_album(request, pk)
        if album is None:
            return JsonResponse({"error": "Album not found"}, status=404)
        fields, error = clean_album_payload(self.payload)
        if error:
            return JsonResponse({"error": error}, status=400)
        for name, value in fields.items():
            setattr(album, name, value)
        album.save()
        return JsonResponse(album_to_dict(album))

    def delete(self, request, pk):
        album = self.get_album(request, pk)
        if album is None:
            return JsonResponse({"error": "Album not found"}, status=404)
        album.delete()
        return JsonResponse({}, status=204)


class AlbumFavoriteView(ApiView):
    def post(self, request, pk):
        album = self.get_album(request, pk)
        if album is None:
            return JsonResponse({"error": "Album not found"}, status=404)
        album.favorite = not album.favorite
        album.save(update_fields=["favorite"])
        return JsonResponse(album_to_dict(album))


class ImportView(ApiView):
    """Replace the user's entire collection with a VinylVault JSON backup."""

    def post(self, request):
        libraries = self.payload.get("libraries")
        if not isinstance(libraries, list):
            return JsonResponse({"error": "Backup must contain a 'libraries' list"}, status=400)

        cleaned = []
        for lib_data in libraries:
            lib_fields, error = clean_library_payload(lib_data)
            if error:
                return JsonResponse({"error": error}, status=400)
            albums = []
            for album_data in lib_data.get("albums", []):
                album_fields, error = clean_album_payload(album_data)
                if error:
                    return JsonResponse(
                        {"error": f"Album '{album_data.get('title', '?')}': {error}"},
                        status=400,
                    )
                album_fields["favorite"] = bool(album_data.get("favorite"))
                albums.append(album_fields)
            cleaned.append((lib_fields, albums))

        with transaction.atomic():
            Library.objects.filter(owner=request.user).delete()
            for lib_fields, albums in cleaned:
                library = Library.objects.create(owner=request.user, **lib_fields)
                Album.objects.bulk_create(
                    Album(library=library, **album_fields) for album_fields in albums
                )

        libraries = Library.objects.filter(owner=request.user).prefetch_related("albums")
        return JsonResponse({"libraries": [library_to_dict(l) for l in libraries]})


class SpotifySearchView(ApiView):
    def get(self, request):
        query = request.GET.get("q", "").strip()
        if not query:
            return JsonResponse({"error": "Query parameter 'q' is required"}, status=400)
        try:
            limit = min(int(request.GET.get("limit", 10)), 50)
        except ValueError:
            limit = 10
        try:
            results = get_service().search_albums(query, limit=limit)
        except ImproperlyConfigured as exc:
            return JsonResponse({"error": str(exc)}, status=503)
        except requests.RequestException:
            return JsonResponse({"error": "Spotify API request failed"}, status=502)
        return JsonResponse({"results": results})


class SpotifyAlbumView(ApiView):
    def get(self, request, spotify_id):
        try:
            album = get_service().get_album(spotify_id)
        except ImproperlyConfigured as exc:
            return JsonResponse({"error": str(exc)}, status=503)
        except requests.RequestException:
            return JsonResponse({"error": "Spotify API request failed"}, status=502)
        return JsonResponse(album)
