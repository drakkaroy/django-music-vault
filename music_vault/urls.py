from django.urls import path

from . import views

app_name = "music_vault"

urlpatterns = [
    # React/TypeScript rewrite is now the default UI — see docs/frontend.md#react-rewrite.
    path("", views.vault_react, name="vault"),
    # Original vanilla frontend, kept for reference/rollback.
    path("legacy/", views.vault, name="vault-legacy"),
    path("api/state/", views.StateView.as_view(), name="api-state"),
    path("api/libraries/", views.LibraryListView.as_view(), name="api-libraries"),
    path("api/libraries/<int:pk>/", views.LibraryDetailView.as_view(), name="api-library"),
    path(
        "api/libraries/<int:pk>/albums/", views.AlbumListView.as_view(), name="api-library-albums"
    ),
    path("api/albums/<int:pk>/", views.AlbumDetailView.as_view(), name="api-album"),
    path(
        "api/albums/<int:pk>/favorite/",
        views.AlbumFavoriteView.as_view(),
        name="api-album-favorite",
    ),
    path("api/albums/<int:pk>/move/", views.AlbumMoveView.as_view(), name="api-album-move"),
    path("api/albums/<int:pk>/copy/", views.AlbumCopyView.as_view(), name="api-album-copy"),
    path("api/import/", views.ImportView.as_view(), name="api-import"),
    path(
        "api/public/<str:username>/<slug:library_slug>/",
        views.PublicLibraryView.as_view(),
        name="api-public-library",
    ),
    path("api/spotify/search/", views.SpotifySearchView.as_view(), name="api-spotify-search"),
    path(
        "api/spotify/albums/<str:spotify_id>/",
        views.SpotifyAlbumView.as_view(),
        name="api-spotify-album",
    ),
    path("api/spotify/status/", views.SpotifyStatusView.as_view(), name="api-spotify-status"),
    path(
        "api/spotify/disconnect/",
        views.SpotifyDisconnectView.as_view(),
        name="api-spotify-disconnect",
    ),
    path(
        "api/spotify/now-playing/",
        views.SpotifyNowPlayingView.as_view(),
        name="api-spotify-now-playing",
    ),
    path(
        "api/spotify/top-albums/",
        views.SpotifyTopAlbumsView.as_view(),
        name="api-spotify-top-albums",
    ),
    path("api/albums/<int:pk>/play/", views.AlbumPlayView.as_view(), name="api-album-play"),
    # Real browser redirects (OAuth), not JSON — kept outside api/
    path("spotify/connect/", views.spotify_connect, name="spotify-connect"),
    path("spotify/callback/", views.spotify_callback, name="spotify-callback"),
    # Public library share pages — must stay last: a username equal to
    # "api", "legacy", or "spotify" would otherwise shadow those routes.
    # The same applies one level up: this pattern matches *any* two-segment
    # path, so a host project must put include("music_vault.urls") after its
    # own routes (docs/integration.md#3-urlspy) or they get shadowed too.
    path("<str:username>/<slug:library_slug>/", views.public_library, name="public-library"),
]
