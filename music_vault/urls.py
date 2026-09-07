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
    path("api/libraries/<int:pk>/albums/", views.AlbumListView.as_view(), name="api-library-albums"),
    path("api/albums/<int:pk>/", views.AlbumDetailView.as_view(), name="api-album"),
    path("api/albums/<int:pk>/favorite/", views.AlbumFavoriteView.as_view(), name="api-album-favorite"),
    path("api/import/", views.ImportView.as_view(), name="api-import"),
    path("api/spotify/search/", views.SpotifySearchView.as_view(), name="api-spotify-search"),
    path("api/spotify/albums/<str:spotify_id>/", views.SpotifyAlbumView.as_view(), name="api-spotify-album"),
    path("api/spotify/status/", views.SpotifyStatusView.as_view(), name="api-spotify-status"),
    path("api/spotify/disconnect/", views.SpotifyDisconnectView.as_view(), name="api-spotify-disconnect"),
    path("api/spotify/now-playing/", views.SpotifyNowPlayingView.as_view(), name="api-spotify-now-playing"),
    path("api/spotify/top-albums/", views.SpotifyTopAlbumsView.as_view(), name="api-spotify-top-albums"),
    path("api/albums/<int:pk>/play/", views.AlbumPlayView.as_view(), name="api-album-play"),
    # Real browser redirects (OAuth), not JSON — kept outside api/
    path("spotify/connect/", views.spotify_connect, name="spotify-connect"),
    path("spotify/callback/", views.spotify_callback, name="spotify-callback"),
]
