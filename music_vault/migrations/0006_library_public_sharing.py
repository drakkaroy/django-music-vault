from django.db import migrations, models
from django.utils.text import slugify


def backfill_slugs(apps, schema_editor):
    Library = apps.get_model("music_vault", "Library")
    used_by_owner = {}
    for library in Library.objects.order_by("owner_id", "created_at", "pk"):
        used = used_by_owner.setdefault(library.owner_id, set())
        base = slugify(library.name) or "library"
        slug = base
        suffix = 2
        while slug in used:
            slug = f"{base}-{suffix}"
            suffix += 1
        used.add(slug)
        library.slug = slug
        library.save(update_fields=["slug"])


class Migration(migrations.Migration):

    dependencies = [
        ("music_vault", "0005_album_rating"),
    ]

    operations = [
        migrations.AddField(
            model_name="library",
            name="slug",
            field=models.SlugField(blank=True, default="", max_length=220),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="library",
            name="is_public",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(backfill_slugs, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="library",
            constraint=models.UniqueConstraint(fields=["owner", "slug"], name="unique_library_slug_per_owner"),
        ),
    ]
