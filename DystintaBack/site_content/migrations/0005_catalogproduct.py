# Generated for public catalog products.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("site_content", "0004_sitesettings_theme"),
    ]

    operations = [
        migrations.CreateModel(
            name="CatalogProduct",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("image", models.ImageField(blank=True, null=True, upload_to="site/catalog/")),
                ("order", models.PositiveIntegerField(default=0)),
                ("active", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ["order", "id"],
            },
        ),
    ]
