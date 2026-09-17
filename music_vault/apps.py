from django.apps import AppConfig


class MusicVaultConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "music_vault"
    verbose_name = "Music Vault"

    def ready(self):
        from . import checks  # noqa: F401  (registers the system checks)
