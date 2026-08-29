from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver


class Library(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="music_libraries",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default="#e0654a")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name_plural = "libraries"

    def __str__(self):
        return self.name


class Album(models.Model):
    library = models.ForeignKey(
        Library,
        on_delete=models.CASCADE,
        related_name="albums",
    )
    title = models.CharField(max_length=200)
    artist = models.CharField(max_length=200)
    year = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1900), MaxValueValidator(2100)],
    )
    genre = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    label = models.CharField(max_length=200, blank=True)
    cover_url = models.URLField(max_length=500, blank=True)
    # Local copy of the cover (downloaded from Spotify's CDN on request);
    # cover_url always keeps the original remote URL as fallback.
    cover_file = models.FileField(upload_to="music_vault/covers/", blank=True)
    spotify_uri = models.CharField(max_length=255, blank=True)
    tags = models.JSONField(default=list, blank=True)
    # Flat list of {track_number, title, duration_ms, spotify_uri} dicts —
    # same "mirror the frontend, don't design a Track model" choice as tags.
    # Imported wholesale from Spotify or edited as rows in the album form;
    # nothing else in the app ever needs to query a single track by id.
    tracks = models.JSONField(default=list, blank=True)
    favorite = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["artist", "year"]
        indexes = [
            models.Index(fields=["library", "artist"]),
        ]

    def __str__(self):
        return f"{self.artist} — {self.title}"


@receiver(post_delete, sender=Album)
def _delete_cover_file(sender, instance, **kwargs):
    """Remove the downloaded cover from storage when an album is deleted."""
    if instance.cover_file:
        instance.cover_file.delete(save=False)


class SpotifyAccount(models.Model):
    """A user's linked Spotify account (Authorization Code OAuth), used only
    to control playback on their own devices via Spotify Connect."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="spotify_account",
    )
    access_token = models.CharField(max_length=500)
    refresh_token = models.CharField(max_length=500)
    expires_at = models.FloatField()
    scope = models.CharField(max_length=255, blank=True)
    connected_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} — Spotify"
