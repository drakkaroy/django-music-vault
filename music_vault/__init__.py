from importlib.metadata import PackageNotFoundError, version

try:
    __version__ = version("django-music-vault")
except PackageNotFoundError:  # running from a checkout that isn't installed
    __version__ = "0.0.0"
