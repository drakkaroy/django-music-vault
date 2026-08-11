# 🎵 django-music-vault

App Django reutilizable para catalogar tu colección de música: librerías, álbumes, tags ilimitados, favoritos y autocompletado de metadata vía Spotify. Incluye el frontend **VinylVault** (HTML/CSS/JS vanilla, tema oscuro) listo para usar — y también corre standalone: clona el repo, migra y ya tienes tu vault.

## Características

- **Librerías** con nombre, descripción y color; **álbumes** con título, artista, año, género, país, sello, portada, Spotify URI y tags ilimitados.
- **Favoritos**, búsqueda en vivo, filtros combinables (género/país/década/tags) y ordenamiento — todo en el frontend incluido.
- **Export / Import JSON** de toda la colección.
- **API REST JSON** (sin dependencias extra, solo Django) con auth por sesión; cada usuario ve únicamente sus datos.
- **Spotify search/autofill** con client credentials (búsqueda de álbumes y detalle normalizado).
- Sin base de datos hardcodeada: usa la conexión `default` del proyecto host, o la que definas con `DATABASE_ROUTERS`.

## Uso standalone (este repo)

```bash
git clone https://github.com/drakkaroy/django-music-vault.git
cd django-music-vault
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env       # edita credenciales (o bórralo para usar SQLite)
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Abre <http://localhost:8000/> e inicia sesión. Sin `.env` corre con SQLite; con `DB_ENGINE=postgresql` usa Postgres (variables `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`).

## Uso como paquete en otro proyecto

```bash
pip install git+https://github.com/drakkaroy/django-music-vault.git
```

```python
# settings.py
INSTALLED_APPS = [
    ...,
    "music_vault",
]

SPOTIFY_CLIENT_ID = "..."      # opcional, para search/autofill
SPOTIFY_CLIENT_SECRET = "..."

# urls.py
from django.urls import include, path

urlpatterns = [
    ...,
    path("music/", include("music_vault.urls")),
]
```

La vista principal requiere usuario autenticado (`LOGIN_URL` estándar de Django). Los modelos usan la base `default` del proyecto host.

### Base de datos separada (opcional, en el proyecto consumidor)

El paquete no fija ninguna conexión. Si quieres aislar sus tablas en otra base, decláralo en el proyecto host:

```python
# settings.py
DATABASES = {
    "default": {...},
    "music_db": {...},
}
DATABASE_ROUTERS = ["yourproject.routers.MusicVaultRouter"]

# yourproject/routers.py
class MusicVaultRouter:
    route_app_labels = {"music_vault"}

    def db_for_read(self, model, **hints):
        return "music_db" if model._meta.app_label in self.route_app_labels else None

    def db_for_write(self, model, **hints):
        return "music_db" if model._meta.app_label in self.route_app_labels else None

    def allow_migrate(self, db, app_label, **hints):
        if app_label in self.route_app_labels:
            return db == "music_db"
        return None
```

## API

Todos los endpoints van bajo el prefijo donde montes `music_vault.urls` (`/` en el proyecto standalone), requieren sesión iniciada y usan CSRF por cookie + header `X-CSRFToken`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `api/state/` | Colección completa del usuario (`{"libraries": [...]}`) |
| POST | `api/libraries/` | Crear librería `{name, description, color}` |
| PUT / DELETE | `api/libraries/<id>/` | Editar / borrar librería |
| POST | `api/libraries/<id>/albums/` | Agregar álbum |
| PUT / DELETE | `api/albums/<id>/` | Editar / borrar álbum |
| POST | `api/albums/<id>/favorite/` | Alternar favorito |
| POST | `api/import/` | Restaurar backup JSON (reemplaza toda la colección) |
| GET | `api/spotify/search/?q=&limit=` | Buscar álbumes en Spotify |
| GET | `api/spotify/albums/<spotify_id>/` | Detalle normalizado de un álbum de Spotify |

Formato de álbum (espejo del frontend): `{id, title, artist, year, genre, country, label, cover, spotifyUri, tags[], favorite, addedAt}` — ids como string, fechas en epoch ms.

## Variables de entorno

| Variable | Uso |
|---|---|
| `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS` | Config estándar del proyecto standalone |
| `DB_ENGINE` (`sqlite3`/`postgresql`) + `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Base de datos del proyecto standalone |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Credenciales client-credentials para search/autofill ([dashboard](https://developer.spotify.com/dashboard)) |

## Tests

```bash
python manage.py test music_vault
```

## Roadmap

- [ ] Reproducción real vía Spotify Connect (OAuth por usuario)
- [ ] Autocompletar el formulario de álbum desde la búsqueda de Spotify en la UI
- [ ] Rating con estrellas y estadísticas de la colección

## Licencia

MIT
