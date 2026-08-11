from django.urls import path

from . import views

app_name = "music_vault"

urlpatterns = [
    path("", views.vault, name="vault"),
    path("api/state/", views.StateView.as_view(), name="api-state"),
    path("api/libraries/", views.LibraryListView.as_view(), name="api-libraries"),
    path("api/libraries/<int:pk>/", views.LibraryDetailView.as_view(), name="api-library"),
    path("api/libraries/<int:pk>/albums/", views.AlbumListView.as_view(), name="api-library-albums"),
    path("api/albums/<int:pk>/", views.AlbumDetailView.as_view(), name="api-album"),
    path("api/albums/<int:pk>/favorite/", views.AlbumFavoriteView.as_view(), name="api-album-favorite"),
    path("api/import/", views.ImportView.as_view(), name="api-import"),
    path("api/spotify/search/", views.SpotifySearchView.as_view(), name="api-spotify-search"),
    path("api/spotify/albums/<str:spotify_id>/", views.SpotifyAlbumView.as_view(), name="api-spotify-album"),
]
