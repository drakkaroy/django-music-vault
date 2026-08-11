from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


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
    spotify_uri = models.CharField(max_length=255, blank=True)
    tags = models.JSONField(default=list, blank=True)
    favorite = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["artist", "year"]
        indexes = [
            models.Index(fields=["library", "artist"]),
        ]

    def __str__(self):
        return f"{self.artist} — {self.title}"
