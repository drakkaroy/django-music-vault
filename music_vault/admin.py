from django.contrib import admin

from .models import Album, Library, SpotifyAccount


class AlbumInline(admin.TabularInline):
    model = Album
    extra = 0
    fields = ("title", "artist", "year", "genre", "country", "favorite")


@admin.register(Library)
class LibraryAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "color", "created_at")
    list_filter = ("owner",)
    search_fields = ("name", "description")
    inlines = [AlbumInline]


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ("title", "artist", "year", "genre", "country", "library", "favorite")
    list_filter = ("library", "genre", "country", "favorite")
    search_fields = ("title", "artist", "genre", "country", "label")


@admin.register(SpotifyAccount)
class SpotifyAccountAdmin(admin.ModelAdmin):
    list_display = ("user", "connected_at")
    readonly_fields = ("access_token", "refresh_token", "expires_at", "scope", "connected_at")
